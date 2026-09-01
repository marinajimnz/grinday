-- coffees: stable identity of a coffee product/roaster, independent of any
-- particular purchase. preferred_attempt_id is added here as a plain nullable
-- column (no FK yet) — the constraint is wired once brew_attempts exists in
-- Fase 2, per the spec's "FK diferida" note.

create table public.coffees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  roaster text not null,
  country text,
  region text,
  farm text,
  producer text,
  varieties text[] not null default '{}',
  process text,
  altitude_min_m int,
  altitude_max_m int,
  roast_level text check (roast_level in ('light', 'medium', 'dark', 'custom')),
  tasting_notes text[] not null default '{}',
  preferred_attempt_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coffees_altitude_range check (
    altitude_min_m is null or altitude_max_m is null or altitude_min_m <= altitude_max_m
  )
);

create index coffees_user_id_idx on public.coffees (user_id, updated_at desc);

create trigger coffees_set_updated_at
  before update on public.coffees
  for each row execute function public.set_updated_at();

alter table public.coffees enable row level security;

create policy "coffees_all_own"
  on public.coffees for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
