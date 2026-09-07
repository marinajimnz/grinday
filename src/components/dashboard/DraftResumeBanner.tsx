"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getMostRecentDraft, type BrewDraft } from "@/features/brew/draft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function DraftResumeBanner({ currentUserId }: { currentUserId: string }) {
  const dict = useDictionary();
  const [draft, setDraft] = useState<BrewDraft | null>(null);

  useEffect(() => {
    // localStorage doesn't exist during SSR — this can only run client-side
    // after mount.
    function refresh() {
      setDraft(getMostRecentDraft(currentUserId));
    }
    refresh();

    // A mount-only check goes stale the moment this exact page instance is
    // reused instead of remounted — returning to Inicio via the PWA's
    // background/foreground resume, a bfcache restore, or the router's
    // client-side cache can all show this component without re-running its
    // effect, so a draft saved (and cleared) elsewhere in the meantime would
    // otherwise still show a reminder for it. Re-checking whenever the tab
    // becomes visible/focused again covers all of those regardless of cause.
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [currentUserId]);

  if (!draft) return null;

  return (
    <Link
      href={`/brew/live/${draft.draftId}`}
      className="flex items-center justify-between gap-3 rounded-card border border-ink bg-canvas p-4"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{dict.dashboard.draftInProgress}</p>
        <p className="font-display text-xl text-ink">{draft.coffeeName}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 rounded-input bg-ink px-3 py-2 text-sm font-medium text-surface">
        {dict.dashboard.resumeDraft}
        <ArrowRight aria-hidden className="size-4" />
      </span>
    </Link>
  );
}
