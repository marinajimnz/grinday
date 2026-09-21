// Every Playwright test creates its own throwaway account under
// @grinday.test (see tests/e2e/fixtures.ts) and deletes it again in its own
// teardown; this is the safety net for every case where that teardown does
// not run. It is not a rare case: teardown is skipped whenever a run is
// interrupted, and the accounts pile up in the hosted project — 109 of them
// had collected before anyone looked.
//
// Playwright's globalTeardown runs this now (see playwright.config.ts), so
// it happens however the suite was started, including a bare `npx playwright
// test`. It used to hang off the test:e2e npm script alone, which meant
// anyone calling Playwright directly left their accounts behind.
//
// .test is a reserved TLD (RFC 2606): no real person can hold an address
// there, which is what makes deleting the whole domain unattended safe.
// Matching one prefix was not enough — `test-*` and `debugtester.inv@` had
// both been used and both survived the sweep.
//
// CLEANUP_DRY_RUN=1 reports what it would delete and touches nothing.
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

const TEST_EMAIL_PATTERN = /@grinday\.test$/;

let testUsers = [];
let page = 1;
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  testUsers = testUsers.concat(data.users.filter((u) => u.email && TEST_EMAIL_PATTERN.test(u.email)));
  if (data.users.length < 200) break;
  page++;
}

if (testUsers.length === 0) {
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

if (process.env.CLEANUP_DRY_RUN) {
  console.log(
    `[cleanup-test-users] dry run: ${testUsers.length} test user(s) would be deleted:`,
  );
  for (const u of testUsers.slice(0, 5)) console.log(`  ${u.email}`);
  if (testUsers.length > 5) console.log(`  … y ${testUsers.length - 5} más`);
  process.exit(0);
}

let deleted = 0;
const retry = [];
for (const user of testUsers) {
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

console.log(`[cleanup-test-users] deleted ${deleted} test user(s)${failed ? `, ${failed} failed` : ""}.`);
