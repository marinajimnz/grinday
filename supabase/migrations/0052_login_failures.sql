-- Login throttling. Sign-in moved to the server (loginAction) so a
-- username's email never reaches the browser; the side effect is that
-- Supabase Auth now sees every login coming from the app's server, so its
-- own per-IP limit lumps everyone together — one person guessing passwords
-- could lock everybody out. The app keeps its own count instead, keyed by
-- the identifier typed and by the client's IP, both as keyed hashes (an
-- email typed into the login form isn't stored as such).
--
-- Only the service-role client reads or writes this. No policies, and the
-- client roles get no privileges at all: RLS on with nothing granted.

create table public.login_failures (
  key text not null,
  failed_at timestamptz not null default now()
);

create index login_failures_key_idx on public.login_failures (key, failed_at desc);

alter table public.login_failures enable row level security;

revoke all on table public.login_failures from public, anon, authenticated;
