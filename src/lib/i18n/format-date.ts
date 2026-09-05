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

// "ahora" / "ayer" for today/yesterday, falling back to a plain date —
// used for compact activity-feed rows where a full timestamp is too noisy.
export function formatRelativeDay(
  value: string | Date,
  locale: Locale,
  labels: { today: string; yesterday: string },
) {
  const date = typeof value === "string" ? new Date(value) : value;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  return formatDate(date, locale);
}
