import type { Locale } from "./types";

const INTL_LOCALE: Record<Locale, string> = { es: "es-ES", en: "en-US" };

export function formatDate(value: string | Date, locale: Locale) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date, locale: Locale) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(INTL_LOCALE[locale]);
}

// "hoy" / "ayer" for today and yesterday, then a date — used for compact
// activity-feed rows where a full timestamp is too noisy.
//
// The year is dropped for anything brewed this year, which is nearly every
// row in an active journal: printing "2026" down a list where every entry
// says 2026 tells you nothing. It also buys back room the row did not
// have. "Espresso" plus a full date needs 152px next to the rating and the
// time; a 375pt phone leaves 153, and a 360px Android leaves 138, where
// the date wrapped under the method and made that row taller than its
// neighbours. Without the year it needs 119. An older brew keeps its
// year — that is exactly when the year carries meaning.
export function formatRelativeDay(
  value: string | Date,
  locale: Locale,
  labels: { today: string; yesterday: string },
) {
  const date = typeof value === "string" ? new Date(value) : value;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(INTL_LOCALE[locale], { day: "2-digit", month: "short" });
  }
  return formatDate(date, locale);
}
