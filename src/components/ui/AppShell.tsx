"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, House, Settings, SquareChartGantt, Timer } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/coffees", label: "Cafés", icon: Coffee },
  { href: "/brew/new", label: "Preparar", icon: Timer },
  { href: "/stats", label: "Estadísticas", icon: SquareChartGantt },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <nav
        aria-label="Navegación principal"
        className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-border md:bg-surface md:p-4"
      >
        <div className="mb-6 px-2">
          <span className="font-display text-xl text-ink">Grindaily</span>
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-canvas text-ink"
                  : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium",
                active ? "text-ink" : "text-ink-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
