import { LoginForm } from "@/components/settings/LoginForm";
import { LoginLanguageToggle } from "@/components/i18n/LoginLanguageToggle";
import { IconFavorito } from "@/components/icons/pencil-icons";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
        <LoginLanguageToggle />
      </div>

      <div className="fixed inset-x-0 bottom-6 flex flex-col items-center gap-1 px-4">
        <a
          href="https://www.linkedin.com/in/marina-jimenez-mendez/?locale=es"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-display text-lg text-ink-muted"
        >
          Marina <IconFavorito aria-hidden className="size-4 text-coffee" /> coffee
        </a>
        <p className="text-xs text-ink-muted">All rights reserved</p>
      </div>
    </div>
  );
}
