-- coffee_media: package photos for a bag. storage_path is a path inside the
-- private "coffee-photos" bucket, never a public URL — the app resolves a
-- signed URL on read. Path convention: {user_id}/{coffee_bag_id}/{filename},
-- which the storage policies below rely on for ownership checks.

create table public.coffee_media (
  id uuid primary key default gen_random_uuid(),
  coffee_bag_id uuid not null references public.coffee_bags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'package_front'
    check (kind in ('package_front', 'package_back', 'package_detail', 'espresso', 'setup', 'other')),
  storage_path text not null unique,
  is_cover boolean not null default false,
  alt_text text,
  created_at timestamptz not null default now()
);

create index coffee_media_bag_id_idx on public.coffee_media (coffee_bag_id, created_at);

alter table public.coffee_media enable row level security;

create policy "coffee_media_all_own"
  on public.coffee_media for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only one cover photo per bag.
create unique index coffee_media_one_cover_per_bag
  on public.coffee_media (coffee_bag_id)
  where is_cover;

-- Private bucket for package/espresso photos. Never made public — reads go
-- through short-lived signed URLs generated server-side.
insert into storage.buckets (id, name, public)
values ('coffee-photos', 'coffee-photos', false)
on conflict (id) do nothing;

create policy "coffee_photos_owner_select"
  on storage.objects for select
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "coffee_photos_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "coffee_photos_owner_update"
  on storage.objects for update
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "coffee_photos_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);
