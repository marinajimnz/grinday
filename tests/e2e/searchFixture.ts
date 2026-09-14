// Reuses test-fixture-a ("perfil-publico-e2e" / "Perfil Público E2E", see
// profileFixture.ts) for the happy-path searches, and adds a third
// persistent, non-public fixture account so search.spec.ts can assert it
// never shows up in results — is_public has no UI to flip yet, so this is
// the only way to exercise that RLS path until a real "make private"
// feature exists.
import { createClient } from "@supabase/supabase-js";
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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PRIVATE_FIXTURE_PASSWORD = "Grinday-test-fixture-1!";
const PRIVATE_FIXTURE_EMAIL = "test-fixture-c@grinday.test";
const PRIVATE_FIXTURE_USERNAME = "perfil-privado-e2e";

export async function ensurePrivateProfileFixture(): Promise<{ username: string }> {
  const { error: createError } = await admin.auth.admin.createUser({
    email: PRIVATE_FIXTURE_EMAIL,
    password: PRIVATE_FIXTURE_PASSWORD,
    email_confirm: true,
  });
  if (createError && createError.code !== "email_exists") throw createError;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", PRIVATE_FIXTURE_USERNAME)
    .maybeSingle();

  if (existingProfile) {
    // Idempotent: a previous run's assertions, or a stray toggle, could
    // have left is_public in the wrong state — pin it back to false.
    await admin.from("profiles").update({ is_public: false }).eq("id", existingProfile.id);
    return { username: PRIVATE_FIXTURE_USERNAME };
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn, error: signInError } = await anonClient.auth.signInWithPassword({
    email: PRIVATE_FIXTURE_EMAIL,
    password: PRIVATE_FIXTURE_PASSWORD,
  });
  if (signInError || !signIn.user) throw signInError ?? new Error("sign-in returned no user");

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      username: PRIVATE_FIXTURE_USERNAME,
      display_name: "Perfil Privado E2E",
      is_public: false,
    })
    .eq("id", signIn.user.id);
  if (updateError) throw updateError;

  return { username: PRIVATE_FIXTURE_USERNAME };
}
