import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// `next dev` compiles each route lazily on its first request, and the very
// first real interaction on a route could land mid-compile — we've seen that
// manifest as an uncontrolled input losing the value a test just filled.
// Walking every route once, logged in, gets that cost out of the way before
// any test starts.
//
// The suite runs against a production build now (see playwright.config.ts),
// where routes are compiled ahead of time and none of this applies. This
// stays for the one case that still hits it: playwright.config's
// reuseExistingServer picking up a `next dev` you already had running.
//
// The protected routes redirect to /login for an anonymous request, so a
// plain fetch() never actually reaches (and so never compiles) them — this
// needs a real logged-in browser, same as the per-test fixture, just run
// once here before any test starts.
const DUMMY_ID = "00000000-0000-0000-0000-000000000000";
const WARM_UP_PATHS = [
  "/",
  "/coffees",
  "/coffees/new",
  `/coffees/${DUMMY_ID}`,
  `/bags/${DUMMY_ID}`,
  "/attempts/new",
  `/attempts/${DUMMY_ID}`,
  `/brew/live/${DUMMY_ID}`,
  "/brew/new",
  "/settings",
  "/settings/machines",
  "/settings/account",
  "/settings/profile",
  "/inventory",
  "/stats",
  "/compare",
];

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
    for (const line of lines) {
      const i = line.indexOf("=");
      if (i === -1) continue;
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    // fall through to process.env (e.g. CI with real env vars already set)
  }
  return env;
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  const fileEnv = loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[global-setup] missing Supabase env vars, skipping warm-up.");
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = `e2e-warmup-${randomUUID()}@grinday.test`;
  const password = `Warmup-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    console.warn("[global-setup] couldn't create warm-up user, skipping warm-up:", error.message);
    return;
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto("/login");
    await page.getByLabel("Usuario o email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("/", { timeout: 30_000 }).catch(() => {});

    for (const path of WARM_UP_PATHS) {
      await page.goto(path).catch(() => {});
    }
  } finally {
    await browser.close();
    await admin.auth.admin.deleteUser(data.user!.id).catch(() => {});
  }
}
