# Grindaily (Coffee Journal)

Diario personal de café: bolsas, intentos de espresso y recetas reproducibles.
PWA con Next.js (App Router) + Supabase. Ver la especificación completa en
`docs/spec.md` (pendiente de copiar) — construido por fases según el
roadmap de la Fase 0 a la Fase 7.

## Stack

- Next.js 16 (App Router, TypeScript estricto) — build/dev fuerzan `--webpack`
  porque Serwist (PWA) todavía no soporta Turbopack de forma estable.
- Tailwind CSS v4 (tokens en `src/app/globals.css`).
- Supabase (Postgres, Auth con email/contraseña, Storage, RLS).
- Zod + React Hook Form.
- Serwist (service worker / PWA).
- Vitest + Testing Library (unit/component), Playwright (E2E).

## Requisitos previos

1. Node 22+, npm.
2. Un proyecto Supabase (Postgres + Auth + Storage).

La app requiere iniciar sesión — no hay modo invitado. Cada cuenta inicia
sesión con email y contraseña; algunas cuentas (como `admin`) tienen además
un `username` que se resuelve a su email real al iniciar sesión (ver
`src/features/auth/actions.ts`).

## Configuración

```bash
cp .env.example .env.local
# Rellena NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY y SUPABASE_DB_PASSWORD (Project Settings → API / Database)

npm install
npm run dev
```

## Base de datos

Migraciones en `supabase/migrations/`, seed en `supabase/seed.sql` (capacidades
de la Sage Barista Express Impress). Para aplicarlas a un proyecto remoto:

```bash
npx supabase login   # una vez, requiere un access token de supabase.com/dashboard/account/tokens
npx supabase link --project-ref <ref>
npm run db:push       # supabase db push --linked --include-seed
```

Tras cada migración, regenera los tipos TypeScript:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

## Scripts

- `npm run dev` / `npm run build` — desarrollo / build de producción.
- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript estricto (app + service worker).
- `npm run test:unit` — Vitest.
- `npm run test:e2e` — Playwright (390×844 y 1440×900).
- `npm run test:integration` — tests contra la base de datos real enlazada
  (grants, RLS, funciones de admin y la foto fija de lo que cada cuenta puede
  alcanzar). Cada test corre en una transacción que siempre se deshace, así
  que no deja nada detrás. Necesita `SUPABASE_DB_PASSWORD` en `.env.local` y
  el proyecto enlazado (o `SUPABASE_DB_URL`). Para probar una migración antes
  de aplicarla:
  `DRY_RUN_MIGRATION=supabase/migrations/00xx_nombre.sql npm run test:integration`.
  Si cambia a propósito lo que queda expuesto, se actualiza la foto con
  `npm run test:integration -- -u` y el diff se revisa en el PR.

GitHub Actions (`.github/workflows/ci.yml`) corre `typecheck`, `lint` y
`test:unit` en cada push y PR. E2E e integración necesitan el proyecto de
Supabase, así que siguen siendo manuales.

## Estado del roadmap

- [x] Fase 0 — Fundación.
- [x] Fase 1 — Biblioteca de cafés y bolsas.
- [x] Fase 2 — Intentos, preferido, comparación y evolución.
- [x] Fase 3 — Modo preparación, timer, cata y fotos de espresso (este commit).
- [ ] Fase 4 — IA práctica: escaneo del paquete (aplazada — se retoma cuando el usuario quiera).
- [x] Fase 5 — Inventario (este commit).
- [x] Fase 6 — Estadísticas y dashboard (este commit).
- [x] Fase 7 — Hardening PWA, offline, cuenta y release (este commit).
- [x] Perfiles públicos (F0–F9) — perfiles, tostadoras, buscador, favoritos,
  probar recetas ajenas, moderación y denuncias. Ver «Perfiles públicos» abajo.

## Perfiles públicos

Cada cuenta elige si su perfil es público (popup la primera vez; tarjeta
«Privacidad del perfil» arriba del todo en Ajustes). Hasta que elige, cuenta
como privada. El @ público es el nombre de usuario.

- **Qué se comparte:** nombre, @usuario, bio, cafés no archivados con su
  ficha (origen, proceso, tueste, notas de cata), modelos de equipo, intentos
  (día, receta y puntuación). **Nunca:** notas, fotos, bolsas, inventario,
  hora del intento, intentos quitados del inicio ni ids de cuenta.
- **Cómo:** el RLS de las tablas no cambia; otra cuenta solo lee a través de
  funciones `security definer` con columnas explícitas que pasan por
  `profile_is_visible_to_me()` (perfil público, con usuario, no suspendido e
  interruptor encendido). `tests/integration/exposure-surface.test.ts` guarda
  una foto fija de policies, funciones y permisos: cualquier cambio en lo que
  una cuenta puede alcanzar aparece como diff.
- **Interruptor:** `app_settings.social_enabled` (`off`, `admins`, `all`).
  Apagarlo oculta todo lo público al momento, sin desplegar:

  ```sql
  update public.app_settings set social_enabled = 'off';
  ```

- **Moderación:** `/admin` (rol admin **y** sesión con verificación en dos
  pasos) — solicitudes de tostadora con código publicado en su web o
  Instagram, tostadoras, perfiles (suspender, reasignar usuario), handles
  reservados, denuncias y registro. Toda acción pide motivo y queda en
  `moderation_events`; la cuenta afectada ve qué y por qué, nunca quién.
- **Caché:** el Service Worker nunca guarda `/u/*`, `/search`, `/favorites`
  ni `/admin`.

## Offline y PWA

La app es instalable (manifest + Service Worker con Serwist) y guarda un
resumen del café activo en `localStorage` (`grinday:dashboard-snapshot`) cada
vez que se visita el dashboard. Sin conexión, la navegación cae en
`/offline`, que muestra ese resumen y avisa de cualquier intento de brew
guardado localmente (`grinday:brew-draft:*`) pendiente de sincronizar.

La foto del intento se hace en su propio paso (5 de 6), entre el cronómetro
y la puntuación: al probar el café ya no está como salió. Es el único paso
del flujo que necesita conexión — la foto se sube a Storage en el momento,
bajo la carpeta del borrador, y se engancha al intento al guardarlo. Sin red
el paso se puede saltar, y descartar un borrador borra también sus fotos.

Los intentos creados sin red se guardan como borrador local con una
`idempotencyKey` propia; en cuanto vuelve la conexión (evento `online`), el
guardado se reintenta solo — no hace falta que la usuaria haga nada, y
reintentarlo dos veces no duplica el intento gracias a la clave de
idempotencia (`brew_attempts.idempotency_key`, único por usuario).

**Nota de verificación:** el registro real del Service Worker no se puede
comprobar de forma fiable dentro de un navegador automatizado (herramientas
basadas en CDP interceptan las peticiones de red y eso rompe el fetch interno
del navegador para instalar el SW, aunque `/sw.js` se sirva bien). El build
de producción incluye correctamente `/offline` como ruta estática precacheada
y la config `fallbacks` — para la comprobación final en un navegador normal:
`npm run build && npm start`, abre `http://localhost:3000`, y revisa
DevTools → Application → Service Workers.

## Cuenta y datos

El acceso requiere iniciar sesión (`/login`) — no hay modo invitado. El
campo de login acepta un `username` (resuelto a su email real en
`resolveLoginEmailAction`, server-side vía el cliente de service-role) o un
email directamente. Desde **Ajustes → Cuenta** se ve el email vinculado y
hay un botón para cerrar sesión.

Desde la misma pantalla, **Exportar tus datos** descarga un backup manual:
JSON completo (cafés, bolsas, intentos) o CSV solo de intentos
(`/api/export?format=json|csv`). No hay backups automáticos — es la vía
recomendada para respaldar antes de borrar datos del navegador o migrar de
dispositivo.

## Despliegue en Vercel

1. En [vercel.com](https://vercel.com), **Add New → Project** e importa el
   repo `marinajimnz/grinday` desde GitHub.
2. Framework se detecta como Next.js automáticamente. En **Build & Development
   Settings**, cambia el comando de build a `next build --webpack` (Serwist no
   soporta Turbopack todavía).
3. En **Environment Variables**, añade las mismas claves de `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`.
4. Deploy. Vercel asigna un dominio `*.vercel.app`; para un dominio propio,
   **Project → Settings → Domains** y sigue las instrucciones de DNS (puedes
   comprarlo en Vercel o apuntar uno que ya tengas).
5. Las migraciones de Supabase no las aplica Vercel — ejecútalas tú con
   `npm run db:push` antes de desplegar cambios de esquema.
