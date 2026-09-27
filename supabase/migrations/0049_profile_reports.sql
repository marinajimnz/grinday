-- Reports (plan F8): any account can flag a public profile; only an admin
-- (role plus second factor) ever reads a report. The reported account is
-- never told who reported it, and nothing happens to it automatically —
-- an admin decides, with a reason, and it's logged.

alter table public.moderation_events drop constraint moderation_events_action_check;
alter table public.moderation_events
  add constraint moderation_events_action_check check (action in (
    'role_changed',
    'roaster_approved',
    'roaster_rejected',
    'roaster_revoked',
    'profile_suspended',
    'profile_reactivated',
    'username_reassigned',
    'handle_reserved',
    'handle_unreserved',
    'report_resolved',
    'report_dismissed'
  ));

create table public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('impersonation', 'spam', 'inappropriate', 'other')),
  details text check (details is null or length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution text,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (reporter_id <> target_id)
);

-- One open report per reporter and profile: reporting again adds nothing.
create unique index profile_reports_one_open
  on public.profile_reports (reporter_id, target_id)
  where status = 'open';
create index profile_reports_open_idx on public.profile_reports (target_id) where status = 'open';
create index profile_reports_reporter_recent_idx on public.profile_reports (reporter_id, created_at desc);

alter table public.profile_reports enable row level security;
revoke all on public.profile_reports from anon, authenticated;

-- Report a profile the caller can see. Refused the same way as saving one
-- for anything else (private, suspended, missing, yourself). At most 10 a
-- day per account; reporting the same profile again while the first is
-- still open quietly counts as the same report.
create or replace function public.report_profile(p_username text, p_reason text, p_details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
begin
  select p.id into v_target
    from public.profiles p
    where p.username = lower(btrim(p_username))
      and p.id <> auth.uid()
      and public.profile_is_visible_to_me(p.id);
  if v_target is null then
    raise exception 'profile not available' using errcode = 'P0002';
  end if;

  if (select count(*) from public.profile_reports
       where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many reports today' using errcode = 'P0003';
  end if;

  insert into public.profile_reports (reporter_id, target_id, reason, details)
  values (auth.uid(), v_target, p_reason, nullif(left(btrim(coalesce(p_details, '')), 500), ''))
  on conflict (reporter_id, target_id) where status = 'open' do nothing;
end;
$$;

-- The admin's queue: one row per reported profile with its open reports.
-- Reporters are named here (to spot someone abusing the button); the
-- reported account never sees this.
create or replace function public.admin_list_reports()
returns table (
  username text,
  display_name text,
  moderation_status text,
  open_count integer,
  reports jsonb,
  first_reported_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard();
  return query
    select
      t.username,
      t.display_name,
      t.moderation_status,
      count(*)::integer,
      jsonb_agg(
        jsonb_build_object(
          'reason', r.reason,
          'details', r.details,
          'reporter', rp.username,
          'created_at', r.created_at
        ) order by r.created_at desc
      ),
      min(r.created_at)
    from public.profile_reports r
    join public.profiles t on t.id = r.target_id
    left join public.profiles rp on rp.id = r.reporter_id
    where r.status = 'open'
    group by t.id, t.username, t.display_name, t.moderation_status
    order by count(*) desc, min(r.created_at);
end;
$$;

create or replace function public.admin_open_report_count()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard();
  return (select count(distinct target_id)::integer from public.profile_reports where status = 'open');
end;
$$;

-- Close every open report about a profile: either dismiss them, or act —
-- suspend, remove the roaster role, or reassign the username — through
-- the same admin functions the panel uses, then mark them resolved. Both
-- ways are logged with the reason. Returns the new username when one was
-- reassigned.
create or replace function public.admin_resolve_reports(p_username text, p_action text, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_target uuid;
  v_result text;
begin
  perform public.admin_guard();
  v_reason := public.admin_reason(p_reason);
  if p_action not in ('dismiss', 'suspend', 'revoke_roaster', 'reassign_username') then
    raise exception 'unknown action' using errcode = '22023';
  end if;

  v_target := public.admin_target(p_username);
  if not exists (select 1 from public.profile_reports where target_id = v_target and status = 'open') then
    raise exception 'no open reports' using errcode = 'P0002';
  end if;

  if p_action = 'suspend' then
    perform public.admin_set_suspended(p_username, true, v_reason);
  elsif p_action = 'revoke_roaster' then
    perform public.admin_revoke_roaster(p_username, v_reason);
  elsif p_action = 'reassign_username' then
    v_result := public.admin_reassign_username(p_username, v_reason);
  end if;

  update public.profile_reports
    set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
        resolution = v_reason,
        resolved_by = auth.uid(),
        resolved_at = now()
    where target_id = v_target and status = 'open';

  insert into public.moderation_events (actor_id, target_id, action, reason, details)
  values (
    auth.uid(),
    v_target,
    case when p_action = 'dismiss' then 'report_dismissed' else 'report_resolved' end,
    v_reason,
    jsonb_build_object('action', p_action)
  );
  return v_result;
end;
$$;

revoke execute on function public.report_profile(text, text, text) from public, anon;
revoke execute on function public.admin_list_reports() from public, anon;
revoke execute on function public.admin_open_report_count() from public, anon;
revoke execute on function public.admin_resolve_reports(text, text, text) from public, anon;
grant execute on function public.report_profile(text, text, text) to authenticated;
grant execute on function public.admin_list_reports() to authenticated;
grant execute on function public.admin_open_report_count() to authenticated;
grant execute on function public.admin_resolve_reports(text, text, text) to authenticated;
