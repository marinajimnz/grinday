import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./types";

// The middleware keeps this cookie in sync with profiles.locale whenever
// there's a session (see lib/supabase/proxy.ts), so any Server Component
// can read the language cheaply here instead of hitting the DB itself. Pre-
// login (the /login screen has no account yet) the cookie is the only
// source of truth, set directly by the language toggle there.
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
