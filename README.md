# Coffee Journal (Grinday)

Diario personal de café: bolsas, intentos de espresso y recetas reproducibles.
PWA con Next.js (App Router) + Supabase. Ver la especificación completa en
`docs/spec.md` (pendiente de copiar) — construido por fases según el
roadmap de la Fase 0 a la Fase 7.

## Stack

- Next.js 16 (App Router, TypeScript estricto) — build/dev fuerzan `--webpack`
  porque Serwist (PWA) todavía no soporta Turbopack de forma estable.
- Tailwind CSS v4 (tokens en `src/app/globals.css`).
- Supabase (Postgres, Auth con sesión anónima, Storage, RLS).
- Zod + React Hook Form.
- Serwist (service worker / PWA).
- Vitest + Testing Library (unit/component), Playwright (E2E).

## Requisitos previos

1. Node 22+, npm.
2. Un proyecto Supabase (Postgres + Auth + Storage).
3. En el dashboard de Supabase → **Authentication → Sign In / Providers**:
   activar **Anonymous Sign-ins**. Sin esto la sesión de invitado falla.

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

## Estado del roadmap

- [x] Fase 0 — Fundación.
- [x] Fase 1 — Biblioteca de cafés y bolsas.
- [x] Fase 2 — Intentos, preferido, comparación y evolución.
- [x] Fase 3 — Modo preparación, timer, cata y fotos de espresso (este commit).
- [ ] Fase 4 — IA práctica: escaneo del paquete (aplazada — se retoma cuando el usuario quiera).
- [x] Fase 5 — Inventario (este commit).
- [x] Fase 6 — Estadísticas y dashboard (este commit).
- [x] Fase 7 — Hardening PWA, offline, cuenta y release (este commit).

## Offline y PWA

La app es instalable (manifest + Service Worker con Serwist) y guarda un
resumen del café activo en `localStorage` (`grinday:dashboard-snapshot`) cada
vez que se visita el dashboard. Sin conexión, la navegación cae en
`/offline`, que muestra ese resumen y avisa de cualquier intento de brew
guardado localmente (`grinday:brew-draft:*`) pendiente de sincronizar.

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

Cada visitante empieza con una sesión anónima de Supabase (mismo `user_id`
mientras no borre datos del navegador). Desde **Ajustes → Cuenta** puede
vincular esa sesión a un email + contraseña sin perder ni mover nada
(`supabase.auth.updateUser`), y volver a entrar desde otro dispositivo en
`/login`.

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
