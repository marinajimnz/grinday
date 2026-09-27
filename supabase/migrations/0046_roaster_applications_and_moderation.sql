-- Roasters and moderation (plan F6a). A roaster is a regular account that
-- asked to be one, proved it by publishing a code on its website or
-- Instagram, and was approved by an admin. Everything an admin does goes
-- through a function that checks is_admin() — the role *and* a session
-- that passed the second factor — and writes to moderation_events.
--
-- Nothing here changes what the public side shows yet; the roaster's
-- public page is F6b.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'coffee_lover', 'roaster'));

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
    'handle_unreserved'
  ));

-- One application per attempt at becoming a roaster. The code is made
-- here, never chosen by the applicant. Its life:
--   awaiting_code → (the applicant publishes the code) → pending
--   pending → approved | rejected           (an admin decides)
create table public.roaster_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null check (length(btrim(business_name)) between 2 and 80),
  website text check (website is null or length(website) <= 200),
  instagram text check (instagram is null or length(instagram) <= 60),
  city text check (city is null or length(city) <= 80),
  contact_email text not null check (length(contact_email) <= 200 and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  verification_code text not null,
  status text not null default 'awaiting_code'
    check (status in ('awaiting_code', 'pending', 'approved', 'rejected')),
  reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  check (website is not null or instagram is not null)
);

-- At most one open application per account.
create unique index roaster_applications_one_open
  on public.roaster_applications (user_id)
  where status in ('awaiting_code', 'pending');
create index roaster_applications_status_idx on public.roaster_applications (status, submitted_at);

alter table public.roaster_applications enable row level security;
revoke all on public.roaster_applications from anon, authenticated;
grant select on public.roaster_applications to authenticated;

-- An applicant reads their own applications (to see the code and the
-- outcome); nobody else's. Writes only go through the functions below.
create policy "roaster_applications_select_own"
  on public.roaster_applications for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.start_roaster_application(
  p_business_name text,
  p_website text,
  p_instagram text,
  p_city text,
  p_contact_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_code text := 'grindaily-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if v_role <> 'coffee_lover' then
    raise exception 'only regular accounts can apply' using errcode = '22023';
  end if;

  insert into public.roaster_applications
    (user_id, business_name, website, instagram, city, contact_email, verification_code)
  values (
    auth.uid(),
    btrim(p_business_name),
    nullif(btrim(p_website), ''),
    nullif(ltrim(btrim(p_instagram), '@'), ''),
    nullif(btrim(p_city), ''),
    lower(btrim(p_contact_email)),
    v_code
  );
  return v_code;
end;
$$;

-- "I've published the code": puts the application in the admin's queue.
create or replace function public.submit_roaster_application()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.roaster_applications
    set status = 'pending', submitted_at = now()
    where user_id = auth.uid() and status = 'awaiting_code';
  if not found then
    raise exception 'no application awaiting its code' using errcode = 'P0002';
  end if;
end;
$$;

-- What the account itself is told about moderation that touched it: the
-- action, the reason and when — never who did it.
create or replace function public.get_my_moderation_notices()
returns table (action text, reason text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.action, e.reason, e.created_at
  from public.moderation_events e
  where e.target_id = auth.uid()
    and e.action in (
      'roaster_approved', 'roaster_rejected', 'roaster_revoked',
      'profile_suspended', 'profile_reactivated', 'username_reassigned'
    )
  order by e.created_at desc
  limit 5;
$$;

-- ---------------------------------------------------------------------
-- Admin functions. Every one starts with the same guard and logs itself.
-- ---------------------------------------------------------------------

create or replace function public.admin_guard()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_reason(p_reason text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  return left(btrim(p_reason), 500);
end;
$$;

-- The target of an admin action by username: never an admin account.
create or replace function public.admin_target(p_username text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_role text;
begin
  select id, role into v_id, v_role from public.profiles where username = lower(btrim(p_username));
  if v_id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if v_role = 'admin' then
    raise exception 'admin accounts cannot be moderated from the app' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_list_roaster_applications(p_status text default 'pending')
returns table (
  id uuid,
  username text,
  display_name text,
  business_name text,
  website text,
  instagram text,
  city text,
  contact_email text,
  verification_code text,
  status text,
  reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard();
  return query
    select a.id, p.username, p.display_name, a.business_name, a.website, a.instagram, a.city,
           a.contact_email, a.verification_code, a.status, a.reason, a.submitted_at, a.reviewed_at
    from public.roaster_applications a
    join public.profiles p on p.id = a.user_id
    where a.status = p_status
    order by coalesce(a.submitted_at, a.created_at) desc
    limit 100;
end;
$$;

create or replace function public.admin_review_roaster_application(
  p_application_id uuid,
  p_approve boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_app public.roaster_applications;
begin
  perform public.admin_guard();
  -- After the guard, so a caller who isn't an admin learns nothing else.
  v_reason := public.admin_reason(p_reason);

  select * into v_app from public.roaster_applications where id = p_application_id for update;
  if v_app.id is null or v_app.status <> 'pending' then
    raise exception 'no pending application' using errcode = 'P0002';
  end if;

  update public.roaster_applications
    set status = case when p_approve then 'approved' else 'rejected' end,
        reason = v_reason,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = v_app.id;

  if p_approve then
    update public.profiles set role = 'roaster' where id = v_app.user_id and role = 'coffee_lover';
  end if;

  insert into public.moderation_events (actor_id, target_id, action, reason, details)
  values (
    auth.uid(),
    v_app.user_id,
    case when p_approve then 'roaster_approved' else 'roaster_rejected' end,
    v_reason,
    jsonb_build_object('application_id', v_app.id, 'business_name', v_app.business_name)
  );
end;
$$;

create or replace function public.admin_list_roasters()
returns table (username text, display_name text, visibility text, moderation_status text, business_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard();
  return query
    select p.username, p.display_name, p.visibility, p.moderation_status,
           (select a.business_name from public.roaster_applications a
             where a.user_id = p.id and a.status = 'approved'
             order by a.reviewed_at desc limit 1)
    from public.profiles p
    where p.role = 'roaster'
    order by p.username;
end;
$$;

create or replace function public.admin_revoke_roaster(p_username text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_target uuid;
begin
  perform public.admin_guard();
  -- After the guard, so a caller who isn't an admin learns nothing else.
  v_reason := public.admin_reason(p_reason);
  v_target := public.admin_target(p_username);
  update public.profiles set role = 'coffee_lover' where id = v_target and role = 'roaster';
  if not found then
    raise exception 'not a roaster' using errcode = 'P0002';
  end if;
  insert into public.moderation_events (actor_id, target_id, action, reason)
  values (auth.uid(), v_target, 'roaster_revoked', v_reason);
end;
$$;

create or replace function public.admin_set_suspended(p_username text, p_suspended boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_target uuid;
begin
  perform public.admin_guard();
  -- After the guard, so a caller who isn't an admin learns nothing else.
  v_reason := public.admin_reason(p_reason);
  v_target := public.admin_target(p_username);
  update public.profiles
    set moderation_status = case when p_suspended then 'suspended' else 'active' end
    where id = v_target
      and moderation_status = case when p_suspended then 'active' else 'suspended' end;
  if not found then
    raise exception 'nothing to change' using errcode = 'P0002';
  end if;
  insert into public.moderation_events (actor_id, target_id, action, reason)
  values (auth.uid(), v_target, case when p_suspended then 'profile_suspended' else 'profile_reactivated' end, v_reason);
end;
$$;

-- Takes a username away from an account (an impostor holding a roaster's
-- name): the account gets a provisional one and picks a new one from
-- Settings; the old one is reserved so nobody else grabs it meanwhile.
-- The username is also the login alias, so the account signs in with its
-- email or the new username from then on.
create or replace function public.admin_reassign_username(p_username text, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_old text := lower(btrim(p_username));
  v_target uuid;
  v_new text := 'usuario_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  perform public.admin_guard();
  -- After the guard, so a caller who isn't an admin learns nothing else.
  v_reason := public.admin_reason(p_reason);
  v_target := public.admin_target(v_old);
  update public.profiles set username = v_new where id = v_target;
  insert into public.reserved_handles (handle, reason)
    values (v_old, 'reassigned: ' || v_reason)
    on conflict (handle) do nothing;
  insert into public.moderation_events (actor_id, target_id, action, reason, details)
  values (auth.uid(), v_target, 'username_reassigned', v_reason, jsonb_build_object('from', v_old, 'to', v_new));
  return v_new;
end;
$$;

create or replace function public.admin_list_reserved_handles()
returns table (handle text, reason text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard();
  return query select r.handle, r.reason, r.created_at from public.reserved_handles r order by r.handle;
end;
$$;

create or replace function public.admin_reserve_handle(p_handle text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_handle text := lower(ltrim(btrim(p_handle), '@'));
begin
  perform public.admin_guard();
  -- After the guard, so a caller who isn't an admin learns nothing else.
  v_reason := public.admin_reason(p_reason);
  insert into public.reserved_handles (handle, reason) values (v_handle, v_reason);
  insert into public.moderation_events (actor_id, action, reason, details)
  values (auth.uid(), 'handle_reserved', v_reason, jsonb_build_object('handle', v_handle));
end;
$$;

create or replace function public.admin_unreserve_handle(p_handle text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_handle text := lower(ltrim(btrim(p_handle), '@'));
begin
  perform public.admin_guard();
  -- After the guard, so a caller who isn't an admin learns nothing else.
  v_reason := public.admin_reason(p_reason);
  delete from public.reserved_handles where handle = v_handle;
  if not found then
    raise exception 'not reserved' using errcode = 'P0002';
  end if;
  insert into public.moderation_events (actor_id, action, reason, details)
  values (auth.uid(), 'handle_unreserved', v_reason, jsonb_build_object('handle', v_handle));
end;
$$;

-- The log, with usernames instead of account ids.
create or replace function public.admin_list_moderation_events()
returns table (
  created_at timestamptz,
  action text,
  actor_username text,
  target_username text,
  reason text,
  details jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_guard();
  return query
    select e.created_at, e.action, a.username, t.username, e.reason, e.details
    from public.moderation_events e
    left join public.profiles a on a.id = e.actor_id
    left join public.profiles t on t.id = e.target_id
    order by e.created_at desc
    limit 200;
end;
$$;

-- Internal helpers: no client calls them directly.
revoke execute on function public.admin_guard() from public, anon, authenticated;
revoke execute on function public.admin_reason(text) from public, anon, authenticated;
revoke execute on function public.admin_target(text) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.start_roaster_application(text, text, text, text, text)',
    'public.submit_roaster_application()',
    'public.get_my_moderation_notices()',
    'public.admin_list_roaster_applications(text)',
    'public.admin_review_roaster_application(uuid, boolean, text)',
    'public.admin_list_roasters()',
    'public.admin_revoke_roaster(text, text)',
    'public.admin_set_suspended(text, boolean, text)',
    'public.admin_reassign_username(text, text)',
    'public.admin_list_reserved_handles()',
    'public.admin_reserve_handle(text, text)',
    'public.admin_unreserve_handle(text, text)',
    'public.admin_list_moderation_events()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
