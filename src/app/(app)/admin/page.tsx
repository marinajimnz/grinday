import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/features/moderation/queries";
import {
  ModerateProfileForm,
  ReleaseHandleButton,
  ReserveHandleForm,
  ReviewButtons,
  RoasterButtons,
} from "@/components/admin/AdminWidgets";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/i18n/format-date";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const TABS = ["solicitudes", "tostadoras", "perfiles", "handles", "registro"] as const;
type Tab = (typeof TABS)[number];

// Moderation. Only for the admin role, and only useful in a session that
// passed the second factor — every function behind these buttons checks
// both again in the database, so this page is a convenience, not the lock.
// Anyone else gets the same 404 as a page that doesn't exist.
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const access = await getAdminAccess(supabase, user.id);
  if (access === "denied") notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin;

  if (access === "needs_mfa") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
        <h1 className="font-display text-3xl text-ink">{t.title}</h1>
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="font-medium text-ink">{t.needsMfaTitle}</p>
          <p className="mt-1 text-sm text-ink-muted">{t.needsMfaBody}</p>
          <Button href="/settings/account" variant="secondary" className="mt-4">
            {t.needsMfaCta}
          </Button>
        </div>
      </div>
    );
  }

  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "solicitudes";
  const tabLabels: Record<Tab, string> = {
    solicitudes: t.tabApplications,
    tostadoras: t.tabRoasters,
    perfiles: t.tabProfiles,
    handles: t.tabHandles,
    registro: t.tabLog,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{t.title}</h1>

      <nav aria-label={t.tabsLabel} className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((value) => (
          <Link
            key={value}
            href={`/admin?tab=${value}`}
            replace
            scroll={false}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
              tab === value ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink",
            )}
          >
            {tabLabels[value]}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "solicitudes" && <ApplicationsTab />}
        {tab === "tostadoras" && <RoastersTab />}
        {tab === "perfiles" && (
          <div className="rounded-card border border-border bg-surface p-5">
            <p className="mb-4 text-sm text-ink-muted">{t.profilesIntro}</p>
            <ModerateProfileForm />
          </div>
        )}
        {tab === "handles" && <HandlesTab />}
        {tab === "registro" && <LogTab />}
      </div>
    </div>
  );

  async function ApplicationsTab() {
    const { data, error } = await supabase.rpc("admin_list_roaster_applications", { p_status: "pending" });
    if (error) throw error;
    if (!data?.length) return <p className="text-sm text-ink-muted">{t.noApplications}</p>;
    return (
      <ul className="space-y-3">
        {data.map((a) => (
          <li key={a.id} className="rounded-card border border-border bg-surface p-5">
            <p className="font-display text-xl text-ink">{a.business_name}</p>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">{t.applicant}</dt>
                <dd className="text-ink">
                  @{a.username} {a.display_name && `· ${a.display_name}`}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t.expectedCode}</dt>
                <dd className="font-mono text-ink select-all">{a.verification_code}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t.contact}</dt>
                <dd className="break-all text-ink">{a.contact_email}</dd>
              </div>
              {a.submitted_at && (
                <div>
                  <dt className="text-ink-muted">{t.submittedAt}</dt>
                  <dd className="text-ink">{formatDateTime(a.submitted_at, locale)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {a.website && (
                <a href={a.website} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                  {t.openWebsite}
                </a>
              )}
              {a.instagram && (
                <a
                  href={`https://www.instagram.com/${encodeURIComponent(a.instagram)}/`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline"
                >
                  {t.openInstagram} (@{a.instagram})
                </a>
              )}
            </div>
            <div className="mt-4">
              <ReviewButtons applicationId={a.id} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  async function RoastersTab() {
    const { data, error } = await supabase.rpc("admin_list_roasters");
    if (error) throw error;
    if (!data?.length) return <p className="text-sm text-ink-muted">{t.noRoasters}</p>;
    return (
      <ul className="space-y-3">
        {data.map((r) => (
          <li key={r.username} className="rounded-card border border-border bg-surface p-5">
            <p className="font-medium text-ink">
              {r.business_name ?? r.display_name ?? `@${r.username}`}{" "}
              <span className="text-sm text-ink-muted">@{r.username}</span>
              {r.moderation_status === "suspended" && (
                <span className="ml-2 rounded-full bg-canvas px-2 py-0.5 text-xs text-danger">{t.suspended}</span>
              )}
            </p>
            <div className="mt-3">
              <RoasterButtons username={r.username} suspended={r.moderation_status === "suspended"} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  async function HandlesTab() {
    const { data, error } = await supabase.rpc("admin_list_reserved_handles");
    if (error) throw error;
    return (
      <div className="space-y-4">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="mb-4 text-sm text-ink-muted">{t.handlesIntro}</p>
          <ReserveHandleForm />
        </div>
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {(data ?? []).map((h) => (
            <li key={h.handle} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
              <span className="text-sm text-ink">
                @{h.handle}
                {h.reason && <span className="block text-xs text-ink-muted">{h.reason}</span>}
              </span>
              <ReleaseHandleButton handle={h.handle} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  async function LogTab() {
    const { data, error } = await supabase.rpc("admin_list_moderation_events");
    if (error) throw error;
    if (!data?.length) return <p className="text-sm text-ink-muted">{t.noLog}</p>;
    return (
      <ul className="space-y-2">
        {data.map((e, i) => (
          <li key={`${e.created_at}-${i}`} className="rounded-card border border-border bg-surface px-5 py-3 text-sm">
            <p className="text-ink">
              <span className="font-medium">{t.actions[e.action as keyof typeof t.actions] ?? e.action}</span>
              {e.target_username && <> · @{e.target_username}</>}
            </p>
            <p className="text-ink-muted">{e.reason}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {formatDateTime(e.created_at, locale)}
              {e.actor_username && <> · @{e.actor_username}</>}
            </p>
          </li>
        ))}
      </ul>
    );
  }
}
