-- The owner-only policies compared `auth.uid() = user_id`. Written bare,
-- Postgres calls auth.uid() once per row it checks; wrapped in a subselect
-- it becomes an initplan, computed once per statement and reused. Same
-- rule, same result — it's what Supabase's advisor flags as
-- auth_rls_initplan, and the later policies (0046 on) already use the
-- wrapped form. Matters more as the tables grow: every list, count and
-- stats query goes through these.
--
-- alter policy keeps each policy's name, command and roles as they are and
-- only swaps the expressions.

alter policy "profiles_select_own" on public.profiles
  using ((select auth.uid()) = id);
alter policy "profiles_update_own" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "coffees_all_own" on public.coffees
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "coffee_bags_all_own" on public.coffee_bags
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "coffee_media_all_own" on public.coffee_media
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "brew_attempts_all_own" on public.brew_attempts
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "attempt_media_all_own" on public.attempt_media
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "inventory_events_all_own" on public.inventory_events
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "user_grinders_all_own" on public.user_grinders
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "user_brew_equipment_all_own" on public.user_brew_equipment
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "coffee_photos_owner_select" on storage.objects
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "coffee_photos_owner_insert" on storage.objects
  with check (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "coffee_photos_owner_update" on storage.objects
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "coffee_photos_owner_delete" on storage.objects
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
