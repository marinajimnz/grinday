"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";

const LocaleContext = createContext<{ locale: Locale; dict: Dictionary } | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={{ locale, dict }}>{children}</LocaleContext.Provider>;
}

// Client Components can't read cookies/DB themselves — this is how they get
// the same dictionary the server already resolved for this request, instead
// of every one of them re-deriving the locale.
export function useDictionary(): Dictionary {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useDictionary must be used within LocaleProvider");
  return ctx.dict;
}

export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx.locale;
}
