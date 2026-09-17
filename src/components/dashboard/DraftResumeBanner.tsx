"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getMostRecentDraft, saveDraft, type BrewDraft } from "@/features/brew/draft";
import { discardDraft } from "@/features/brew/discardDraft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function DraftResumeBanner({ currentUserId }: { currentUserId: string }) {
  const dict = useDictionary();
  const [draft, setDraft] = useState<BrewDraft | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

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

  // resumeCount is only bumped when the result step is re-entered after
  // already having been left once — so seeing it here means this is at
  // least the second time it's sitting abandoned, and a silent "Continuar"
  // isn't enough anymore: ask the user to explicitly keep or drop it.
  const awaitingDecision = (draft.resumeCount ?? 0) >= 1;

  if (awaitingDecision) {
    const continueLater = () => {
      const reset = { ...draft, resumeCount: 0 };
      saveDraft(reset);
      setDraft(reset);
    };

    const discard = () => {
      // Deliberately not awaited: the banner should go the moment it's
      // dismissed, and the Storage cleanup inside has nothing to report.
      void discardDraft(draft.draftId);
      setConfirmDiscardOpen(false);
      setDraft(null);
    };

    return (
      <>
        <div className="rounded-card border border-ink bg-canvas p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {dict.dashboard.draftAbandonedTitle}
          </p>
          <p className="mt-1 font-display text-xl text-ink">{draft.coffeeName}</p>
          <p className="mt-1 text-sm text-ink-muted">{dict.dashboard.draftAbandonedDescription}</p>
          {/* Asking what to do with a brew and then offering only "drop it"
              and "not now" left out the one answer someone who came back
              mid-pour actually wants, so resuming leads — same destination
              and same label as the silent branch below. Discarding also
              deletes the photos already in Storage (see discardDraft), so it
              goes last, in the same quiet variant as "Seguir más tarde", and
              the destructive weight sits on the confirm instead of on a
              coral slab that a wet thumb can hit by accident. */}
          <div className="mt-4 space-y-2">
            <Button href={`/brew/live/${draft.draftId}`} fullWidth>
              {dict.dashboard.resumeDraft}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={continueLater}
                className={buttonClassName("secondary", { className: "flex-1" })}
              >
                {dict.dashboard.draftAbandonedContinueLater}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiscardOpen(true)}
                className={buttonClassName("secondary", { className: "flex-1" })}
              >
                {dict.dashboard.draftAbandonedDiscard}
              </button>
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={confirmDiscardOpen}
          message={dict.dashboard.draftDiscardConfirm}
          confirmLabel={dict.dashboard.draftAbandonedDiscard}
          cancelLabel={dict.common.cancel}
          confirmVariant="destructive"
          onConfirm={discard}
          onCancel={() => setConfirmDiscardOpen(false)}
        />
      </>
    );
  }

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
