import { APP_TIME_ZONE, todayISO } from "@/lib/time";

const DAY_MS = 86_400_000;

// A "YYYY-MM-DD" as a count of days, so two of them subtract to whole days
// without a clock change or the browser's zone shifting either end.
function dayNumber(isoDate: string) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/**
 * Whole calendar days from the roast date to `on` (YYYY-MM-DD; today on
 * the kitchen's clock by default). Null without a roast date, and for a
 * roast date still ahead — a typo, more likely than a pre-order.
 */
export function daysSinceRoast(roastDate: string | null | undefined, on: string = todayISO()): number | null {
  if (!roastDate) return null;
  const days = dayNumber(on) - dayNumber(roastDate);
  return days >= 0 ? days : null;
}

/** The same, counted to the day a moment fell on — e.g. when a brew was made. */
export function daysSinceRoastAt(roastDate: string | null | undefined, at: string | Date): number | null {
  return daysSinceRoast(roastDate, todayISO(APP_TIME_ZONE, new Date(at)));
}

/** Picks today / one / many and fills in the count. */
export function formatRoastAge(days: number, labels: { today: string; one: string; many: string }): string {
  if (days === 0) return labels.today;
  if (days === 1) return labels.one;
  return labels.many.replace("{count}", String(days));
}
