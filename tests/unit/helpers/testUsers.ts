// Shared fixture for integration tests that hit the real linked Supabase
// project (same project tests/e2e uses). Unlike tests/e2e/fixtures.ts, these
// two accounts are meant to be reused across every phase's tests instead of
// being created and deleted per run — fixed emails outside the `e2e-*`
// pattern so the Playwright cleanup script (scripts/cleanup-test-users.mjs)
// never touches them. Each test file is responsible for cleaning up the
// *data* it creates under these users (coffees, attempts, etc.), not the
// accounts themselves.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "@/types/database";

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
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;

export const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type TestFixtureUser = { id: string; email: string; client: SupabaseClient<Database> };

const FIXTURE_PASSWORD = "Grinday-test-fixture-1!";

/**
 * Returns an authenticated client for one of three persistent test
 * accounts ("a"/"b"/"c"), creating the account the first time it's needed
 * and just signing in on every later call/test run. "c" doubles as the
 * non-public fixture profile tests/e2e/searchFixture.ts sets up (same
 * email, "perfil-privado-e2e") — don't flip its is_public back to true,
 * other suites rely on it staying private.
 */
export async function getTestUser(label: "a" | "b" | "c"): Promise<TestFixtureUser> {
  const email = `test-fixture-${label}@grinday.test`;

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
  });
  if (createError && createError.code !== "email_exists") {
    throw createError;
  }

  const client = createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error: signInError } = await client.auth.signInWithPassword({
    email,
    password: FIXTURE_PASSWORD,
  });
  if (signInError || !data.user) throw signInError ?? new Error("sign-in returned no user");

  return { id: data.user.id, email, client };
}
