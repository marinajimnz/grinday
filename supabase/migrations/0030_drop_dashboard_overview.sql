-- Fed the home screen's stats strip: total brews, average rating,
-- favourite method. The recipe card took that slot — it answers what to
-- brew next rather than how much has been brewed — and nothing has called
-- this since.
--
-- It outlived its callers on purpose. The code that removed them sat on a
-- branch for a while, and dropping a function the deployed dashboard was
-- still calling is exactly how this one got broken once already. That
-- code is now what's live.
drop function if exists public.dashboard_overview();
