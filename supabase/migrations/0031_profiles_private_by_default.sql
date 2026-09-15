-- 0026_public_profiles.sql (Fase 8, aún solo en develop) abrió en lectura
-- coffees/brew_attempts/user_machines/user_grinders/user_brew_equipment a
-- cualquier cuenta autenticada mediante las policies *_select_public, que
-- dependen de profiles.is_public — y lo dejó en `not null default true`.
--
-- Esa apertura es coherente con el perfil público que develop está
-- construyendo, pero main (lo que hay desplegado) no tiene ni perfil
-- público, ni buscador, ni interruptor de privacidad: sus usuarias nunca
-- vieron ni aceptaron que sus cafés y recetas fueran legibles por el resto
-- de cuentas. Mientras esa UI no exista, el flag pasa a ser opt-in.
--
-- No se toca ninguna policy ni ninguna tabla: con is_public = false las
-- policies *_select_public simplemente dejan de encajar y solo queda
-- *_select_own. La Fase 8 sigue funcionando en cuanto un perfil ponga su
-- is_public a true explícitamente.
alter table public.profiles alter column is_public set default false;

update public.profiles set is_public = false where is_public;
