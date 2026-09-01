-- coffee_bags: one physical bag/lot the user bought. user_id is denormalized
-- (rather than joined through coffees) so RLS and the (user_id, updated_at)
-- index stay simple and cheap, matching the pattern used everywhere else.

create table public.coffee_bags (
  id uuid primary key default gen_random_uuid(),
  coffee_id uuid not null references public.coffees (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  roast_date date,
  purchase_date date,
  opened_at date,
  first_brew_at date,
  finished_at date,
  package_weight_g numeric,
  remaining_g numeric,
  inventory_mode text not null default 'none'
    check (inventory_mode in ('none', 'manual_grams', 'approximate_shots')),
  estimated_dose_g numeric,
  status text not null default 'sealed'
    check (status in ('sealed', 'open', 'finished', 'archived')),
  lot_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coffee_bags_user_id_idx on public.coffee_bags (user_id, updated_at desc);
create index coffee_bags_coffee_id_idx on public.coffee_bags (coffee_id, created_at desc);

create trigger coffee_bags_set_updated_at
  before update on public.coffee_bags
  for each row execute function public.set_updated_at();

alter table public.coffee_bags enable row level security;

create policy "coffee_bags_all_own"
  on public.coffee_bags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
