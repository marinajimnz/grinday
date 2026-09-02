import Link from "next/link";
import { ChevronRight, IdCard, UserRound, Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function SettingsPage() {
  const dict = getDictionary(await getLocale());

  const LINKS = [
    { href: "/settings/profile", label: dict.settings.profile, icon: IdCard },
    { href: "/settings/machines", label: dict.settings.machines, icon: Wrench },
    { href: "/settings/account", label: dict.settings.account, icon: UserRound },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.settings.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.settings.subtitle}</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-ink">{dict.settings.appearance}</p>
        <p className="mt-1 text-sm text-ink-muted">{dict.settings.appearanceDescription}</p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </div>

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 items-center gap-3 px-4 text-sm font-medium text-ink"
          >
            <Icon aria-hidden className="size-5 text-ink-muted" />
            <span className="flex-1">{label}</span>
            <ChevronRight aria-hidden className="size-4 text-ink-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
