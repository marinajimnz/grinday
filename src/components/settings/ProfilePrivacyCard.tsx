"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Modal } from "@/components/ui/Modal";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { PublicProfileSummary } from "@/components/profile/PublicProfileSummary";
import { setVisibilityAction } from "@/features/profile/actions";
import type { Visibility } from "@/features/profile/queries";

const UNDO_WINDOW_MS = 10_000;

// Top of Settings, above everything else: whether the profile is public,
// and one button to flip it. Going private is immediate — one tap, no
// confirmation, with a short undo — because it only ever hides things.
// Going public asks first and shows exactly what will be seen.
export function ProfilePrivacyCard({
  visibility,
  username,
}: {
  visibility: Visibility;
  // The public @ (0039).
  username: string | null;
}) {
  const dict = useDictionary();
  const t = dict.publicProfile;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingPublic, setConfirmingPublic] = useState(false);
  const [undoable, setUndoable] = useState(false);
  const isPublic = visibility === "public";

  useEffect(() => {
    if (!undoable) return;
    const timer = setTimeout(() => setUndoable(false), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [undoable]);

  function save(next: "public" | "private", onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await setVisibilityAction({ visibility: next });
      if (!result.success) {
        setError(result.message);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{t.cardTitle}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink">
          {isPublic ? <Globe aria-hidden className="size-3.5" /> : <Lock aria-hidden className="size-3.5" />}
          {isPublic ? t.statusPublic : t.statusPrivate}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {isPublic ? t.cardPublicBody.replace("{username}", username ?? "") : t.cardPrivateBody}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isPublic ? (
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => save("private", () => setUndoable(true))}>
            <Lock aria-hidden className="size-4" />
            <LoadingLabel loading={isPending}>{t.makePrivate}</LoadingLabel>
          </Button>
        ) : (
          <Button type="button" onClick={() => setConfirmingPublic(true)} disabled={isPending}>
            <Globe aria-hidden className="size-4" />
            {t.makePublicCta}
          </Button>
        )}
      </div>

      {undoable && !isPublic && (
        <p role="status" className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-ink">
          {t.madePrivate}
          <button
            type="button"
            className="min-h-11 font-medium underline"
            disabled={isPending}
            onClick={() => save("public", () => setUndoable(false))}
          >
            {t.undo}
          </button>
        </p>
      )}

      {error && !confirmingPublic && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Modal
        open={confirmingPublic}
        title={t.confirmPublicTitle}
        onClose={isPending ? undefined : () => setConfirmingPublic(false)}
      >
        <form
          className="mt-3 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save("public", () => setConfirmingPublic(false));
          }}
        >
          <PublicProfileSummary />
          {username && (
            <p className="rounded-input bg-canvas px-3 py-2.5 text-sm text-ink">
              {t.foundAs.replace("{username}", username)}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="submit" fullWidth disabled={isPending}>
              <LoadingLabel loading={isPending}>{t.makePublic}</LoadingLabel>
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isPending}
              onClick={() => {
                setError(null);
                setConfirmingPublic(false);
              }}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
