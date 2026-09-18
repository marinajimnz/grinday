import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { IconFavorito } from "@/components/icons/pencil-icons";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <LocaleProvider locale={locale} dict={dict}>
      {/* The app shell gives its pages a <main> and a labelled <nav>; the
          auth pages had no landmarks at all, so a screen reader had nothing
          to jump to and the footer credit read as part of the form. */}
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-16">
        {children}
      </main>

      <footer className="fixed inset-x-0 bottom-6 flex flex-col items-center gap-1 px-4">
        <a
          href="https://www.linkedin.com/in/marina-jimenez-mendez/?locale=es"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-display text-lg text-ink-muted"
        >
          Marina <IconFavorito aria-hidden className="size-4 text-coffee" /> coffee
        </a>
        <p className="text-xs text-ink-muted">All rights reserved</p>
      </footer>
    </LocaleProvider>
  );
}
