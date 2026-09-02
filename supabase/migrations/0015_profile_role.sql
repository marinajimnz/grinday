-- Profiles feature, v1: just the one admin profile per account. `role` is a
-- closed enum with a single value on purpose — the column exists now so a
-- second role can be added later (`check` constraint widened, UI gains a
-- picker) without another migration to retrofit identity onto `profiles`.

alter table public.profiles
  add column role text not null default 'admin'
  check (role in ('admin'));
