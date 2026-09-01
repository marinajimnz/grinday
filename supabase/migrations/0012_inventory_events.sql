-- inventory_events: append-only ledger of everything that changes how much
-- coffee is left in a bag. coffee_bags.remaining_g becomes a denormalized
-- cache of sum(delta_g), kept in sync by a trigger below — so it's always
-- consistent (including when an attempt that consumed coffee is ever
-- deleted: attempt_id cascades, the event disappears, the trigger re-fires)
-- and never negative.

create table public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  coffee_bag_id uuid not null references public.coffee_bags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.brew_attempts (id) on delete cascade,
  kind text not null check (kind in ('initial', 'manual_adjustment', 'brew_consumption')),
  delta_g numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create index inventory_events_bag_id_idx on public.inventory_events (coffee_bag_id, created_at);
create index inventory_events_attempt_id_idx on public.inventory_events (attempt_id);

alter table public.inventory_events enable row level security;

create policy "inventory_events_all_own"
  on public.inventory_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recompute the cached remaining_g whenever the ledger for a bag changes
-- (insert, correction, or a cascaded delete from a removed attempt).
-- greatest(..., 0) is what guarantees "no se generan cantidades negativas".
create or replace function public.recompute_bag_remaining()
returns trigger
language plpgsql
as $$
declare
  v_bag_id uuid := coalesce(new.coffee_bag_id, old.coffee_bag_id);
  v_sum numeric;
begin
  select coalesce(sum(delta_g), 0) into v_sum
    from public.inventory_events
    where coffee_bag_id = v_bag_id;

  update public.coffee_bags
    set remaining_g = greatest(v_sum, 0)
    where id = v_bag_id;

  return null;
end;
$$;

create trigger inventory_events_recompute_remaining
  after insert or update or delete on public.inventory_events
  for each row execute function public.recompute_bag_remaining();
