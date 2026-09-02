import Link from "next/link";
import { ChevronRight, IdCard, UserRound, Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";

const LINKS = [
  { href: "/settings/profile", label: "Perfil", icon: IdCard },
  { href: "/settings/machines", label: "Máquinas", icon: Wrench },
  { href: "/settings/account", label: "Cuenta y privacidad", icon: UserRound },
] as const;

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Ajustes</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Máquinas, cuenta, exportación y preferencias de la app.
      </p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-ink">Apariencia</p>
        <p className="mt-1 text-sm text-ink-muted">
          Elige si la app sigue el modo del sistema o se queda fija en claro u oscuro.
        </p>
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
