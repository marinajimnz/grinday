/**
 * The zone this journal lives in. One person, one kitchen: a coffee made
 * at 00:30 belongs to the day it felt like, not to the UTC day before.
 * Every date the app decides for itself — a bag's finish date, the edges
 * of a stats period — is read off this clock, so they can never disagree.
 * If Grinday ever has users in two zones this becomes a profile field.
 */
export const APP_TIME_ZONE = "Europe/Madrid";

/** What the calendar on the kitchen wall says right now, as YYYY-MM-DD. */
export function todayISO(timeZone: string = APP_TIME_ZONE, now: Date = new Date()): string {
  const { year, month, day } = todayParts(timeZone, now);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The same reading, as numbers, for callers doing calendar arithmetic. */
export function todayParts(
  timeZone: string,
  now: Date,
): { year: number; month: number; day: number } {
  // "en-CA" is the shortest route to YYYY-MM-DD; the parts are what we
  // actually want, and formatToParts avoids depending on that format.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month") - 1, day: get("day") };
}
