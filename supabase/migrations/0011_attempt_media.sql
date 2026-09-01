-- attempt_media: espresso/setup photos attached to a brew attempt. Same
-- private bucket as coffee_media ("coffee-photos"); the storage RLS
-- policies there only check the first path segment (owner's user_id), so no
-- new bucket or storage policy is needed — just a distinct path prefix
-- ({user_id}/attempts/{attempt_id}/...) to keep objects organized.

create table public.attempt_media (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.brew_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'espresso'
    check (kind in ('espresso', 'setup', 'other')),
  storage_path text not null unique,
  is_cover boolean not null default false,
  alt_text text,
  created_at timestamptz not null default now()
);

create index attempt_media_attempt_id_idx on public.attempt_media (attempt_id, created_at);

alter table public.attempt_media enable row level security;

create policy "attempt_media_all_own"
  on public.attempt_media for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index attempt_media_one_cover_per_attempt
  on public.attempt_media (attempt_id)
  where is_cover;
