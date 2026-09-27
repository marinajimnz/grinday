"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { PublicProfileSummary } from "./PublicProfileSummary";
import { setVisibilityAction } from "@/features/profile/actions";
import { useIsOnline } from "@/lib/useIsOnline";

// The one-time question every account answers before its profile can be
// public: existing accounts see it the first time they come in once the
// public side is on for them; new ones right after signing up (?bienvenida,
// set by the register form). It can't be dismissed — closing it would have
// to mean one of the two answers, and neither is ours to pick — but both
// answers are always in plain sight, and so is the username that becomes
// the public @.
export function VisibilityPrompt({ username }: { username: string | null }) {
  const dict = useDictionary();
  const t = dict.publicProfile;
  const router = useRouter();
  const isWelcome = useSearchParams().has("bienvenida");
  const isOnline = useIsOnline();
  const [answered, setAnswered] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"public" | "private" | null>(null);
  const [, startTransition] = useTransition();

  // Offline, the answer couldn't be saved; the question waits for a
  // connection instead of trapping someone in it. Once "done" is on screen
  // it stays until closed, connection or not.
  const open = !answered && (isOnline || done);

  function choose(visibility: "public" | "private") {
    if (!navigator.onLine) {
      setError(t.offline);
      return;
    }
    setError(null);
    setPending(visibility);
    startTransition(async () => {
      const result = await setVisibilityAction({ visibility });
      setPending(null);
      if (!result.success) {
        setError(result.message);
        return;
      }
      if (visibility === "public") {
        setDone(true);
      } else {
        setAnswered(true);
        router.refresh();
      }
    });
  }

  if (done) {
    return (
      <Modal open={open} title={t.doneTitle}>
        <div className="mt-3 space-y-5">
          <p className="text-sm text-ink">{t.doneBody}</p>
          <Button
            type="button"
            fullWidth
            onClick={() => {
              setAnswered(true);
              router.refresh();
            }}
          >
            {t.doneClose}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} title={isWelcome ? t.promptWelcomeTitle : t.promptTitle}>
      <div className="mt-3 space-y-5">
        <p className="text-sm text-ink">{isWelcome ? t.promptWelcomeIntro : t.promptIntro}</p>
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
          <Button type="button" fullWidth disabled={pending !== null} onClick={() => choose("public")}>
            <LoadingLabel loading={pending === "public"}>{t.makePublic}</LoadingLabel>
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={pending !== null}
            onClick={() => choose("private")}
          >
            <LoadingLabel loading={pending === "private"}>{t.stayPrivate}</LoadingLabel>
          </Button>
        </div>
        <p className="text-xs text-ink-muted">{t.changeLater}</p>
      </div>
    </Modal>
  );
}
