export type Locale = "es" | "en";

export const LOCALE_COOKIE = "grindaily-locale";
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "es" || value === "en";
}
