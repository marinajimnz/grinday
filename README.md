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
- [ ] Fase 4 — IA práctica: escaneo del paquete.
- [ ] Fase 5 — Inventario.
- [ ] Fase 6 — Estadísticas y dashboard.
- [ ] Fase 7 — Hardening PWA, offline, cuenta y release.
