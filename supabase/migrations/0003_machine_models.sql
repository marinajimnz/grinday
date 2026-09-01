-- machine_models: global, versioned catalog of machine capabilities.
-- Not user-owned. Readable by everyone (including anonymous guests), writable
-- only by service_role (seed script / future admin tooling).

create table public.machine_models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand text not null,
  model_name text not null,
  capabilities_version int not null default 1,
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger machine_models_set_updated_at
  before update on public.machine_models
  for each row execute function public.set_updated_at();

alter table public.machine_models enable row level security;

create policy "machine_models_select_all"
  on public.machine_models for select
  using (true);

-- No insert/update/delete policy for anon/authenticated: only service_role
-- (which bypasses RLS) can write to this catalog.
