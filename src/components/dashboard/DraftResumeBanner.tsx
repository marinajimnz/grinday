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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(getMostRecentDraft(currentUserId));
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
