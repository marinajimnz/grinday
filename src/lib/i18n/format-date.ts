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
