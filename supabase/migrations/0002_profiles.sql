-- profiles: 1:1 with auth.users. Preferences and non-sensitive metadata only.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_anonymous boolean not null default true,
  default_machine_id uuid, -- FK added once user_machines exists (0004).
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A profile row is created automatically whenever a new auth user (including
-- anonymous guests) is created, so the app never has to remember to do it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, is_anonymous)
  values (new.id, coalesce(new.is_anonymous, false));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
