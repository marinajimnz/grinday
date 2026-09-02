-- Language preference, tied to the account so it follows you across
-- devices once logged in. Before login (on /login itself) there's no
-- account yet, so that screen's toggle falls back to a cookie instead —
-- see src/lib/i18n/locale.ts.

alter table public.profiles
  add column locale text not null default 'es'
  check (locale in ('es', 'en'));
