-- Two leftovers from features that no longer exist.
--
-- `profiles.is_public` was added when the app was going to have public
-- profiles, and survived the migration that tore the rest of that work
-- back out — it had to, because another branch's already-applied
-- migration referenced it. Nothing reads it now: no policy, no function,
-- no view, no line of the app. It isn't merely dead, though. Two profiles
-- are still flagged true even though the migration that made profiles
-- private set every one of them false, so the next policy that consults
-- this column would open those two accounts without anyone deciding to.
alter table public.profiles drop column is_public;

-- `dashboard_overview()` fed the home screen's stats strip — total brews,
-- average rating, favourite method. That strip was replaced by the recipe
-- card, which answers "what do I brew next" instead of "how much have I
-- brewed", and nothing has called this since.
drop function if exists public.dashboard_overview();
