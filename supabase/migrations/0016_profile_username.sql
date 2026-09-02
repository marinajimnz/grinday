-- Login is now mandatory (no more anonymous guest sessions). Most accounts
-- will log in with their real email, but a handful (starting with the one
-- "admin" account) want a plain username instead — Supabase Auth itself is
-- always email-based under the hood, so `username` is an optional alias
-- resolved to that account's real (possibly synthetic) email at login time,
-- server-side only (see features/auth/actions.ts).

alter table public.profiles
  add column username text unique;
