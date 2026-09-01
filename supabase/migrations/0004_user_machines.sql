-- user_machines: a user's own instance of a machine model, with persistent
-- adjustments (e.g. upper burr setting) that get snapshotted into each
-- brew_attempt at creation time (added in a later phase).

create table public.user_machines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  machine_model_id uuid not null references public.machine_models (id),
  nickname text,
  settings jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_machines_user_id_idx on public.user_machines (user_id, updated_at desc);

create trigger user_machines_set_updated_at
  before update on public.user_machines
  for each row execute function public.set_updated_at();

alter table public.user_machines enable row level security;

create policy "user_machines_all_own"
  on public.user_machines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only one default machine per user.
create unique index user_machines_one_default_per_user
  on public.user_machines (user_id)
  where is_default;

alter table public.profiles
  add constraint profiles_default_machine_fk
  foreign key (default_machine_id) references public.user_machines (id) on delete set null;
