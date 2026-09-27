-- Groundwork for public profiles (plan F0). Nothing here exposes anything to
-- another account; it closes a hole that already exists and lays down the
-- pieces every later phase leans on.

-- 1. `profiles_update_own` (0002) scopes updates to your own row, but not to
-- any particular column — and Supabase grants UPDATE on every column to
-- `authenticated` by default. So anyone holding the anon key and their own
-- session could `update profiles set role = 'admin'` straight against the
-- REST API, no app involved. Harmless while `role` only drove a badge in
-- Settings; not once it gates moderation or marks a public roaster.
--
-- UPDATE goes back to only the columns the app itself lets people edit:
-- the display name (Settings → Profile), the username (Settings → Account)
-- and the language toggle. Sign-up writes the same columns through the
-- service-role client, which these grants don't touch. `role` now only
-- changes through set_profile_role() below.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, username, locale) on public.profiles to authenticated;

-- 2. The kill switch every public-facing function will consult: 'off' (the
-- whole public side answers as if nothing existed), 'admins' (only admin
-- accounts see it, for testing against real data) or 'all'. One row, read
-- only from inside functions — no client can see or flip it; flipping it is
-- a one-line update from the SQL editor, no deploy needed.
create table public.app_settings (
  id boolean primary key default true check (id),
  social_enabled text not null default 'off'
    check (social_enabled in ('off', 'admins', 'all')),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- 3. Whether the caller may act as an admin. The role alone isn't enough:
-- the session must also have passed a second factor (aal2), so a leaked
-- password on its own can't moderate anyone. `authenticated` needs execute
-- because RLS policies call it with the querying user's privileges; all it
-- can tell a caller is whether they themselves are an admin right now.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 4. Append-only record of every moderation action. Rows only come in
-- through admin functions (security definer), and nothing — not even an
-- admin session — can update or delete one. actor/target survive an account
-- deletion as nulls so the history itself doesn't vanish with it.
create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  target_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('role_changed')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index moderation_events_created_at_idx on public.moderation_events (created_at desc);
create index moderation_events_target_id_idx on public.moderation_events (target_id, created_at desc);

alter table public.moderation_events enable row level security;
revoke all on public.moderation_events from anon, authenticated;
grant select on public.moderation_events to authenticated;

create policy "moderation_events_select_admin"
  on public.moderation_events for select
  to authenticated
  using ((select public.is_admin()));

-- 5. The only way `role` changes from now on. Admin accounts themselves are
-- out of its reach in both directions — nobody is made or unmade an admin
-- from inside the app, only from the SQL editor — which also means an admin
-- can't lock themselves out by demoting their own account.
create or replace function public.set_profile_role(
  p_profile_id uuid,
  p_role text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_role = 'admin' then
    raise exception 'admin role cannot be granted from the app' using errcode = '42501';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  select role into v_current
    from public.profiles
    where id = p_profile_id
    for update;

  if v_current is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_current = 'admin' then
    raise exception 'admin accounts cannot be changed from the app' using errcode = '42501';
  end if;

  if v_current = p_role then
    return;
  end if;

  -- The check constraint on profiles.role rejects anything unknown.
  update public.profiles set role = p_role where id = p_profile_id;

  insert into public.moderation_events (actor_id, target_id, action, reason, details)
  values (
    auth.uid(),
    p_profile_id,
    'role_changed',
    btrim(p_reason),
    jsonb_build_object('from', v_current, 'to', p_role)
  );
end;
$$;

revoke execute on function public.set_profile_role(uuid, text, text) from public, anon;
grant execute on function public.set_profile_role(uuid, text, text) to authenticated;

-- 6. handle_new_user() is a trigger function running as its owner; Postgres
-- refuses to run it outside a trigger, but it still showed up as callable
-- by anon and authenticated. Firing the trigger needs no execute grant.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
