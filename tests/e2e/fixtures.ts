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

    // A long sequential run (many tests, each creating + signing in its own
    // account) occasionally outpaces Supabase Auth under load — same known
    // class of flakiness as the old anonymous-sign-in rate limiting, just
    // hitting a different endpoint now. Retrying the whole attempt clears it.
    await expect(async () => {
      await page.goto("/login");
      await page.getByLabel("Usuario o email").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(page).toHaveURL("/", { timeout: 8000 });
    }).toPass({ intervals: [1000, 2000, 4000], timeout: 30000 });

    // Playwright's fixture callback, not a React hook — the rule matches on
    // the `use` name alone and can't tell the two apart.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({ email, password });

    await admin.auth.admin.deleteUser(data.user!.id);
  },
});

export { expect };
