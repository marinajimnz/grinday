import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// The throwaway accounts each test creates are deleted by the fixture that
// made them, but only when teardown actually runs — an interrupted run, a
// crashed worker or a killed process all leave theirs behind in the hosted
// Supabase project. Hanging the sweep off the test:e2e npm script left a
// hole the size of `npx playwright test`, which is how most runs start.
// Playwright runs this whatever the entry point was.
//
// Spawned rather than imported: the script is the same one the npm script
// runs, plain ESM under node, and there is no second copy of the rules that
// decide what counts as a test account.
export default function globalTeardown() {
  try {
    execFileSync("node", [resolve(__dirname, "../../scripts/cleanup-test-users.mjs")], {
      stdio: "inherit",
    });
  } catch (error) {
    // A failed sweep must not fail a green suite: the accounts are junk in a
    // test-only domain, and the next run sweeps them too.
    console.warn("[global-teardown] cleanup failed:", (error as Error).message);
  }
}
