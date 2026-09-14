// Extends the Fase 9 profile fixture (test-fixture-a, "perfil-publico-e2e")
// with a second persistent fixture user, "perfil-publico-e2e-b", and resets
// any existing follow relationship between the two before each run — so
// profile.spec.ts's follow/unfollow test always starts from a clean slate
// without recreating either account.
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

const FIXTURE_PASSWORD = "Grinday-test-fixture-1!";
const FIXTURES = {
  a: { email: "test-fixture-a@grinday.test", username: "perfil-publico-e2e", displayName: "Perfil Público E2E" },
  b: {
    email: "test-fixture-b@grinday.test",
    username: "perfil-publico-e2e-b",
    displayName: "Perfil Público E2E B",
  },
} as const;

async function ensureFixtureUser(label: "a" | "b"): Promise<{ id: string; email: string; username: string }> {
  const fixture = FIXTURES[label];

  const { error: createError } = await admin.auth.admin.createUser({
    email: fixture.email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
  });
  if (createError && createError.code !== "email_exists") throw createError;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", fixture.username)
    .maybeSingle();
  if (existingProfile) return { id: existingProfile.id, email: fixture.email, username: fixture.username };

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn, error: signInError } = await anonClient.auth.signInWithPassword({
    email: fixture.email,
    password: FIXTURE_PASSWORD,
  });
  if (signInError || !signIn.user) throw signInError ?? new Error("sign-in returned no user");

  const { error: updateError } = await admin
    .from("profiles")
    .update({ username: fixture.username, display_name: fixture.displayName })
    .eq("id", signIn.user.id);
  if (updateError) throw updateError;

  return { id: signIn.user.id, email: fixture.email, username: fixture.username };
}

export async function ensureFollowFixtureUsers(): Promise<{
  a: { id: string; email: string; username: string; password: string };
  b: { id: string; email: string; username: string; password: string };
}> {
  const [a, b] = await Promise.all([ensureFixtureUser("a"), ensureFixtureUser("b")]);

  await admin.from("follows").delete().eq("follower_id", a.id).eq("followee_id", b.id);

  return {
    a: { ...a, password: FIXTURE_PASSWORD },
    b: { ...b, password: FIXTURE_PASSWORD },
  };
}
