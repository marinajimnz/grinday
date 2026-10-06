import { LoginForm } from "@/components/settings/LoginForm";
import { AuthLanguageToggle } from "@/components/i18n/AuthLanguageToggle";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.pageTitles.login);

export default async function LoginPage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-center text-5xl text-ink">grindaily</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">{dict.login.tagline}</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <LoginForm />
      </div>

      <div className="mt-4 flex justify-center">
        <AuthLanguageToggle />
      </div>
    </div>
  );
}
