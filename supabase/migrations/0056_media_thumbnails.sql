-- Every photo is shown as a tile, never at full size, yet tiles loaded the
-- 1600px original. Uploads now also store a small copy beside the original
-- (at `{name}.thumb.jpg`, see src/lib/media/thumbnail.ts), and this says
-- whether a row's copy exists. Existing rows start without one and keep
-- showing the original until scripts/backfill-thumbnails.mjs makes theirs.
--
-- Row-level grants are untouched: these tables have no column grants, so
-- the owner-only policies (0053) cover the new column like the others.

alter table public.coffee_media add column has_thumbnail boolean not null default false;
alter table public.attempt_media add column has_thumbnail boolean not null default false;
