// Seeds the persistent `test-fixture-a` account (shared with the Vitest
// RLS test, tests/unit/helpers/testUsers.ts) with a stable username and one
// public coffee + preferred recipe, so profile.spec.ts's public-profile
// tests have something real to look at. Idempotent and never deletes
// anything — matches the "reuse test fixtures across phases" convention.
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

const FIXTURE_EMAIL = "test-fixture-a@grinday.test";
const FIXTURE_PASSWORD = "Grinday-test-fixture-1!";
const FIXTURE_USERNAME = "perfil-publico-e2e";
const FIXTURE_COFFEE_NAME = "E2E Fixture Blend";

export async function ensurePublicProfileFixture(): Promise<{
  username: string;
  coffeeName: string;
}> {
  const { error: createError } = await admin.auth.admin.createUser({
    email: FIXTURE_EMAIL,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
  });
  if (createError && createError.code !== "email_exists") throw createError;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", FIXTURE_USERNAME)
    .maybeSingle();

  let userId: string;
  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    // First run ever: the account has whatever auto-generated username the
    // signup trigger gave it — sign in to find its id, then rename it to
    // the fixed handle this spec expects.
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signInError } = await anonClient.auth.signInWithPassword({
      email: FIXTURE_EMAIL,
      password: FIXTURE_PASSWORD,
    });
    if (signInError || !signIn.user) throw signInError ?? new Error("sign-in returned no user");
    userId = signIn.user.id;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ username: FIXTURE_USERNAME, display_name: "Perfil Público E2E" })
      .eq("id", userId);
    if (updateError) throw updateError;
  }

  const { data: existingCoffee } = await admin
    .from("coffees")
    .select("id")
    .eq("user_id", userId)
    .eq("name", FIXTURE_COFFEE_NAME)
    .maybeSingle();

  if (!existingCoffee) {
    const { data: machine, error: machineModelError } = await admin
      .from("machine_models")
      .select("id")
      .eq("slug", "sage-barista-express-impress")
      .single();
    if (machineModelError || !machine)
      throw machineModelError ?? new Error("seed machine model not found");

    const { data: userMachine, error: machineError } = await admin
      .from("user_machines")
      .insert({ user_id: userId, machine_model_id: machine.id })
      .select("id")
      .single();
    if (machineError || !userMachine) throw machineError ?? new Error("no user_machine");

    const { data: coffee, error: coffeeError } = await admin
      .from("coffees")
      .insert({ user_id: userId, name: FIXTURE_COFFEE_NAME, roaster: "E2E Roaster" })
      .select("id")
      .single();
    if (coffeeError || !coffee) throw coffeeError ?? new Error("no coffee");

    const { data: bag, error: bagError } = await admin
      .from("coffee_bags")
      .insert({ coffee_id: coffee.id, user_id: userId })
      .select("id")
      .single();
    if (bagError || !bag) throw bagError ?? new Error("no bag");

    const { data: attempt, error: attemptError } = await admin
      .from("brew_attempts")
      .insert({
        user_id: userId,
        coffee_id: coffee.id,
        coffee_bag_id: bag.id,
        machine_id: userMachine.id,
        grind_setting: 12,
      })
      .select("id")
      .single();
    if (attemptError || !attempt) throw attemptError ?? new Error("no attempt");

    const { error: preferredError } = await admin
      .from("coffees")
      .update({ preferred_attempt_id: attempt.id })
      .eq("id", coffee.id);
    if (preferredError) throw preferredError;
  }

  return { username: FIXTURE_USERNAME, coffeeName: FIXTURE_COFFEE_NAME };
}
