"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { loadDashboardSnapshot, listPendingDraftIds, type DashboardSnapshot } from "@/features/dashboard/snapshot";
import { Button } from "@/components/ui/Button";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n/types";

// This page stays outside every layout that resolves the locale via
// cookies() server-side — that's what keeps it statically prerenderable for
// the Service Worker's precache (see RootLayout). So it reads the same
// cookie itself, client-side, same as the localStorage reads below.
function readClientLocale() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export default function OfflinePage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<string[]>([]);
  const [dict, setDict] = useState(() => getDictionary(DEFAULT_LOCALE));

  useEffect(() => {
    // localStorage/cookies don't exist during SSR/prerender — this can only
    // be read client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(loadDashboardSnapshot());
    setPendingDrafts(listPendingDraftIds());
    setDict(getDictionary(readClientLocale()));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-2 text-ink-muted">
        <WifiOff aria-hidden className="size-5" />
        <h1 className="font-display text-2xl text-ink">{dict.offline.title}</h1>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{dict.offline.subtitle}</p>

      {snapshot && (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {dict.offline.activeCoffeeLocal}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{snapshot.roaster}</p>
          <p className="font-display text-2xl text-ink">{snapshot.coffeeName}</p>
          {snapshot.lastAttemptNo && (
            <p className="mt-2 text-sm text-ink-muted">
              {dict.dashboard.lastAttempt}: #{snapshot.lastAttemptNo}
              {snapshot.lastAttemptRating ? ` · ${snapshot.lastAttemptRating}/5` : ""}
            </p>
          )}
        </div>
      )}

      {pendingDrafts.length > 0 && (
        <div className="mt-4 rounded-card border border-border bg-canvas p-5">
          <p className="text-sm text-ink">
            {pendingDrafts.length === 1
              ? dict.offline.onePendingDraft
              : dict.offline.multiplePendingDrafts.replace("{n}", String(pendingDrafts.length))}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{dict.offline.willSyncAutomatically}</p>
        </div>
      )}

      {!snapshot && pendingDrafts.length === 0 && (
        <p className="mt-6 text-sm text-ink-muted">{dict.offline.nothingSavedLocally}</p>
      )}

      <Button href="/" className="mt-6">
        {dict.common.retry}
      </Button>
    </div>
  );
}
