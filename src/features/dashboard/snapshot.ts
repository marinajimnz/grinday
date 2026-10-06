// Fase 7 §11.2 / acceptance: "modo avión permite consultar café activo".
// A tiny localStorage snapshot (not IndexedDB — the data is a few short
// strings, so a heavier store buys nothing) written every time the
// dashboard successfully renders, read back by the offline fallback page
// when there's no network to render the real one.

export type DashboardSnapshot = {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  lastAttemptNo?: number;
  lastAttemptRating?: number;
  savedAt: number;
};

const KEY = "grinday:dashboard-snapshot";

export function saveDashboardSnapshot(snapshot: DashboardSnapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error("[dashboard-snapshot] failed to save:", err);
  }
}

export function loadDashboardSnapshot(): DashboardSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DashboardSnapshot) : null;
  } catch (err) {
    console.error("[dashboard-snapshot] failed to load:", err);
    return null;
  }
}

export function clearDashboardSnapshot() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.error("[dashboard-snapshot] failed to clear:", err);
  }
}

export function listPendingDraftIds(): string[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith("grinday:brew-draft:"))
      .map((k) => k.replace("grinday:brew-draft:", ""));
  } catch (err) {
    console.error("[dashboard-snapshot] failed to list pending drafts:", err);
    return [];
  }
}
