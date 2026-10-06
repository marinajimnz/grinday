import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { ProfilePrivacyCard } from "@/components/settings/ProfilePrivacyCard";
import { createClient } from "@/lib/supabase/server";
import { getMyPublicIdentity } from "@/features/profile/queries";
import { getMyModerationNotices } from "@/features/moderation/queries";
import { formatDate } from "@/lib/i18n/format-date";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { IconCuenta, IconGrano, IconMaquinas, IconPerfil } from "@/components/icons/pencil-icons";
import { ShieldCheck } from "lucide-react";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.settings.title);

export default async function SettingsPage() {
  const dict = getDictionary(await getLocale());
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [identity, role, notices] = user
    ? await Promise.all([
        getMyPublicIdentity(supabase, user.id),
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => data?.role ?? null),
        getMyModerationNotices(supabase),
      ])
    : [null, null, []];
  const locale = await getLocale();
  const openReports =
    role === "admin" ? await supabase.rpc("admin_open_report_count").then(({ data }) => data ?? 0) : 0;

  const LINKS = [
    { href: "/settings/profile", label: dict.settings.profile, icon: IconPerfil },
    { href: "/settings/machines", label: dict.settings.machines, icon: IconMaquinas },
    { href: "/settings/account", label: dict.settings.account, icon: IconCuenta },
    // Asking to be a roaster only makes sense once there's a public side.
    ...(identity?.socialEnabled && role !== "admin"
      ? [{ href: "/settings/roaster", label: dict.roaster.settingsLink, icon: IconGrano }]
      : []),
    ...(role === "admin"
      ? [
          {
            href: "/admin",
            // How many reported profiles are waiting — only answers for an
            // admin session that passed the second factor.
            label: openReports ? `${dict.admin.settingsLink} (${openReports})` : dict.admin.settingsLink,
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.settings.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.settings.subtitle}</p>

      {/* What moderation did to this account, and why — never by whom. */}
      {notices.length > 0 && (
        <div className="mt-8 rounded-card border border-coffee/40 bg-surface p-5">
          <p className="text-sm font-medium text-ink">{dict.notices.title}</p>
          <ul className="mt-2 space-y-2">
            {notices.map((notice) => (
              <li key={`${notice.action}-${notice.createdAt}`} className="text-sm">
                <span className="font-medium text-ink">
                  {dict.admin.actions[notice.action as keyof typeof dict.admin.actions] ?? notice.action}
                </span>{" "}
                <span className="text-ink-muted">· {formatDate(notice.createdAt, locale)}</span>
                <span className="block text-ink-muted">{dict.notices.reason.replace("{reason}", notice.reason)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* First thing in Settings, on purpose: making a profile private is
          never more than one tap away. */}
      {identity?.socialEnabled && (
        <div className="mt-8">
          <ProfilePrivacyCard visibility={identity.visibility} username={identity.username} />
        </div>
      )}

      <div
        className={cn(
          "rounded-card border border-border bg-surface p-5",
          identity?.socialEnabled ? "mt-6" : "mt-8",
        )}
      >
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
