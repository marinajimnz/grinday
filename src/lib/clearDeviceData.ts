// What a signed-out device shouldn't keep of the account that was on it.
// Run when signing out and after deleting the account.
//
// Two things hold someone's data in the browser past their session:
// - the service worker's runtime caches, which keep copies of every page
//   visited (Home, coffees, attempts…) so they open offline;
// - the dashboard snapshot behind /offline, which isn't tied to an account.
// On a shared device, whoever came next could open either while offline.
//
// Kept on purpose: the precache (the app's own files, nobody's data), the
// theme preference, and brew drafts — those are already scoped to their
// account (see draft.ts) and may hold a brew that hasn't synced yet;
// throwing them away on sign-out would lose it.

import { clearDashboardSnapshot } from "@/features/dashboard/snapshot";

export async function clearDeviceData() {
  clearDashboardSnapshot();

  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !name.includes("precache")).map((name) => caches.delete(name)));
  } catch (error) {
    // Best-effort: signing out must not fail because a cache wouldn't clear.
    console.error("[sign-out] couldn't clear the page caches", error);
  }
}
