// Login is mandatory now, so every test needs a real, isolated account —
// the old "visit any page, get a fresh anonymous session" bootstrap is
// gone. This fixture creates one throwaway user per test (so tests stay as
// isolated as they were under anonymous auth), logs in through the real UI,
// and deletes the user again afterwards. Import `test`/`expect` from here
// instead of "@playwright/test" in every spec, and request `testUser` in the
// test signature even when the value itself isn't needed — that's what
// triggers the login.
import { test as base, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const fileEnv = loadEnv();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const test = base.extend<{ testUser: { email: string; password: string } }>({
  testUser: async ({ page }, use) => {
    const email = `e2e-${randomUUID()}@grinday.test`;
    const password = `Test-${randomUUID()}`;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;

    // Signing in is the first click of every single test, and under `next
    // dev` the login form is interactive-looking well before hydration
    // attaches its submit handler — a click that passes every actionability
    // check can land on nothing at all, leaving the form sitting there with
    // no error to report.
    //
    // The goto stays outside the retry on purpose. Re-navigating threw away
    // whatever hydration progress the page had made, so every attempt raced
    // from scratch and a slow-to-hydrate page could lose all of them; keeping
    // one page and retrying only fill-then-submit lets each attempt start
    // closer to hydrated than the last. Supabase Auth itself has also been
    // seen to hiccup under a long run, and the same retry covers that.
    await page.goto("/login");
    await expect(async () => {
      await page.getByLabel("Usuario o email").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(page).toHaveURL("/", { timeout: 8000 });
    }).toPass({ intervals: [500, 1000, 2000], timeout: 40000 });

    // Playwright's fixture callback, not a React hook — the rule matches on
    // the `use` name alone and can't tell the two apart.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({ email, password });

    await admin.auth.admin.deleteUser(data.user!.id);
  },
});

export { expect };
