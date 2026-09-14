-- Fase 10: relación de seguimiento, abierta y sin aprobación (como
-- X/Twitter) — coherente con que todo el contenido es público por
-- defecto. follower_id/followee_id referencian auth.users, igual que el
-- resto de tablas de la app (coffees.user_id, etc.), no public.profiles.

create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_id_idx on public.follows (followee_id, created_at desc);

alter table public.follows enable row level security;

-- Unlike every other table's "_select_own"/"_select_public" pair, this one
-- is unconditionally open to any authenticated user — who follows whom is
-- itself public information here, not gated by an owner's is_public flag.
-- Restricted `to authenticated` (rather than the usual bare `using`) so the
-- anon role — which has no owner check to fall back on — can't read it.
create policy "follows_select_authenticated"
  on public.follows for select
  to authenticated
  using (true);

create policy "follows_insert_own"
  on public.follows for insert
  to authenticated
  with check (follower_id = auth.uid());

create policy "follows_delete_own"
  on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());
