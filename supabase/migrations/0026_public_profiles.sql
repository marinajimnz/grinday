-- Fase 8: cimientos de datos para el perfil público. Añade los campos de
-- identidad social a `profiles`, garantiza que toda cuenta tenga `username`
-- (algunas cuentas antiguas se crearon antes de que fuera obligatorio), y
-- abre en modo solo-lectura el contenido "maestro" (coffees, brew_attempts,
-- equipo) de cualquier perfil público a cualquier otra usuaria autenticada.
-- `coffee_bags` y `coffee_media` se quedan fuera a propósito: son
-- inventario personal, no aportan al perfil social.

alter table public.profiles
  add column avatar_url text,
  add column bio text check (char_length(bio) <= 160),
  add column is_public boolean not null default true;

-- Backfill: cualquier `profiles` sin username (cuentas creadas antes de que
-- fuera obligatorio en el registro) recibe uno derivado de su
-- `display_name`, respetando el mismo formato que exige el registro
-- (`^[a-z0-9_-]{3,20}$`), con un sufijo numérico si hay colisión con un
-- username ya existente (propio o recién asignado en este mismo backfill).
do $$
declare
  r record;
  base text;
  candidate text;
  suffix int;
begin
  for r in select id, display_name from public.profiles where username is null order by created_at loop
    base := lower(coalesce(r.display_name, ''));
    base := regexp_replace(base, '[^a-z0-9_-]+', '-', 'g');
    base := regexp_replace(base, '(^-+|-+$)', '', 'g');
    base := substring(base from 1 for 16);

    if char_length(base) < 3 then
      base := 'usuario';
    end if;

    candidate := base;
    suffix := 1;
    while exists (select 1 from public.profiles where username = candidate) loop
      suffix := suffix + 1;
      candidate := base || '-' || suffix::text;
    end loop;

    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

alter table public.profiles
  alter column username set not null;

create policy "profiles_select_public"
  on public.profiles for select
  using (is_public = true);

-- coffees: sustituye la policy única "for all" por cuatro policies propias
-- más una quinta de lectura pública.
drop policy "coffees_all_own" on public.coffees;

create policy "coffees_select_own"
  on public.coffees for select
  using (auth.uid() = user_id);

create policy "coffees_insert_own"
  on public.coffees for insert
  with check (auth.uid() = user_id);

create policy "coffees_update_own"
  on public.coffees for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "coffees_delete_own"
  on public.coffees for delete
  using (auth.uid() = user_id);

create policy "coffees_select_public"
  on public.coffees for select
  using (exists (
    select 1 from public.profiles p
    where p.id = coffees.user_id and p.is_public
  ));

-- brew_attempts: la "receta" visible/clonable en el perfil público es el
-- brew_attempt marcado como preferido de un coffee, así que esta tabla
-- también necesita lectura pública.
drop policy "brew_attempts_all_own" on public.brew_attempts;

create policy "brew_attempts_select_own"
  on public.brew_attempts for select
  using (auth.uid() = user_id);

create policy "brew_attempts_insert_own"
  on public.brew_attempts for insert
  with check (auth.uid() = user_id);

create policy "brew_attempts_update_own"
  on public.brew_attempts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brew_attempts_delete_own"
  on public.brew_attempts for delete
  using (auth.uid() = user_id);

create policy "brew_attempts_select_public"
  on public.brew_attempts for select
  using (exists (
    select 1 from public.profiles p
    where p.id = brew_attempts.user_id and p.is_public
  ));

-- user_machines: parte del equipo que se muestra en el perfil público.
drop policy "user_machines_all_own" on public.user_machines;

create policy "user_machines_select_own"
  on public.user_machines for select
  using (auth.uid() = user_id);

create policy "user_machines_insert_own"
  on public.user_machines for insert
  with check (auth.uid() = user_id);

create policy "user_machines_update_own"
  on public.user_machines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_machines_delete_own"
  on public.user_machines for delete
  using (auth.uid() = user_id);

create policy "user_machines_select_public"
  on public.user_machines for select
  using (exists (
    select 1 from public.profiles p
    where p.id = user_machines.user_id and p.is_public
  ));

-- user_grinders: idem, parte del equipo del perfil público.
drop policy "user_grinders_all_own" on public.user_grinders;

create policy "user_grinders_select_own"
  on public.user_grinders for select
  using (auth.uid() = user_id);

create policy "user_grinders_insert_own"
  on public.user_grinders for insert
  with check (auth.uid() = user_id);

create policy "user_grinders_update_own"
  on public.user_grinders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_grinders_delete_own"
  on public.user_grinders for delete
  using (auth.uid() = user_id);

create policy "user_grinders_select_public"
  on public.user_grinders for select
  using (exists (
    select 1 from public.profiles p
    where p.id = user_grinders.user_id and p.is_public
  ));

-- user_brew_equipment: idem.
drop policy "user_brew_equipment_all_own" on public.user_brew_equipment;

create policy "user_brew_equipment_select_own"
  on public.user_brew_equipment for select
  using (auth.uid() = user_id);

create policy "user_brew_equipment_insert_own"
  on public.user_brew_equipment for insert
  with check (auth.uid() = user_id);

create policy "user_brew_equipment_update_own"
  on public.user_brew_equipment for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_brew_equipment_delete_own"
  on public.user_brew_equipment for delete
  using (auth.uid() = user_id);

create policy "user_brew_equipment_select_public"
  on public.user_brew_equipment for select
  using (exists (
    select 1 from public.profiles p
    where p.id = user_brew_equipment.user_id and p.is_public
  ));
