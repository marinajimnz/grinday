import { MfaChallengeForm } from "@/components/settings/MfaChallengeForm";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// Reached only through the proxy: a signed-in session whose account has two-
// step verification on but hasn't entered its code yet is sent here from
// every other page, and a session that doesn't need it is sent away.
export default async function MfaPage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-center text-4xl text-ink">{dict.mfa.title}</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">{dict.mfa.subtitle}</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <MfaChallengeForm />
      </div>

      <div className="mt-4 flex justify-center">
        <SignOutButton />
      </div>
    </div>
  );
}
