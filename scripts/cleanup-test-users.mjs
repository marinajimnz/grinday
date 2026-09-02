// Every Playwright run signs in a fresh anonymous session per test, leaving
// a throwaway Supabase auth user (and its coffees/attempts/etc, cascade-
// deleted along with it) behind. This sweeps those up after `test:e2e`.
//
// Only ever touches anonymous users — anyone who linked an email (the demo
// account included) is never a candidate, so this is safe to run
// unattended after every local test run.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const lines = readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n");
    for (const line of lines) {
      const i = line.indexOf("=");
      if (i === -1) continue;
      const key = line.slice(0, i).trim();
      if (key && !(key in process.env)) process.env[key] = line.slice(i + 1).trim();
    }
  } catch {
    // no .env.local (e.g. CI with real env vars already set) — fine
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn("[cleanup-test-users] missing Supabase env vars, skipping.");
  process.exit(0);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let anonymousUsers = [];
let page = 1;
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  anonymousUsers = anonymousUsers.concat(data.users.filter((u) => u.is_anonymous));
  if (data.users.length < 200) break;
  page++;
}

if (anonymousUsers.length === 0) {
  console.log("[cleanup-test-users] nothing to clean up.");
  process.exit(0);
}

// The auth admin API's cascade delete times out for users with a full data
// footprint (coffee + bag + attempt + inventory events — i.e. anyone who
// went through the guided brew flow), reproducibly. Clearing the child rows
// ourselves first keeps each deleteUser() call on the fast, empty-cascade
// path instead of relying on retries to paper over it.
const CHILD_TABLES = [
  "inventory_events",
  "attempt_media",
  "coffee_media",
  "brew_attempts",
  "coffee_bags",
  "coffees",
  "user_machines",
];

async function clearChildRows(id) {
  for (const table of CHILD_TABLES) {
    await supabase.from(table).delete().eq("user_id", id);
  }
}

async function deleteUser(id) {
  const { error } = await supabase.auth.admin.deleteUser(id);
  return error;
}

let deleted = 0;
const retry = [];
for (const user of anonymousUsers) {
  const error = await deleteUser(user.id);
  if (error) retry.push(user.id);
  else deleted++;
}

// Any leftovers are almost always the cascade-timeout case above — clear
// their rows explicitly, then retry the delete on the now-fast path.
let failed = 0;
for (const id of retry) {
  await clearChildRows(id);
  const error = await deleteUser(id);
  if (error) {
    failed++;
    console.error(`[cleanup-test-users] failed to delete ${id}:`, error.message);
  } else {
    deleted++;
  }
}

console.log(`[cleanup-test-users] deleted ${deleted} anonymous test user(s)${failed ? `, ${failed} failed` : ""}.`);
