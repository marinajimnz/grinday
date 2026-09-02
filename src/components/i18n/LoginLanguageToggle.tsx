"use client";

import { useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";

// There's no account yet on /login, so the preference lives only in a
// cookie here — once someone signs in, profiles.locale takes over (synced
// back to this same cookie by the middleware) and this same cookie is what
// a brand-new account starts from.
export function LoginLanguageToggle() {
  const router = useRouter();

  return (
    <LanguageToggle
      onChange={(locale: Locale) => {
        document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000`;
        router.refresh();
      }}
    />
  );
}
