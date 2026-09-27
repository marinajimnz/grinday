"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { PublicProfileSummary } from "./PublicProfileSummary";
import { HandleField } from "./HandleField";
import { setVisibilityAction } from "@/features/profile/actions";
import { useIsOnline } from "@/lib/useIsOnline";

type Step = "choose" | "handle" | "done";

// The one-time question every account answers before its profile can be
// public: existing accounts see it the first time they come in once the
// public side is on for them; new ones right after signing up (?bienvenida,
// set by the register form). It can't be dismissed — closing it would have
// to mean one of the two answers, and neither is ours to pick — but both
// answers are always in plain sight.
export function VisibilityPrompt({
  currentHandle,
  suggestedHandle,
}: {
  currentHandle: string | null;
  suggestedHandle: string;
}) {
  const dict = useDictionary();
  const t = dict.publicProfile;
  const router = useRouter();
  const isWelcome = useSearchParams().has("bienvenida");
  const isOnline = useIsOnline();
  const [answered, setAnswered] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [handle, setHandle] = useState(currentHandle ?? suggestedHandle);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"public" | "private" | null>(null);
  const [, startTransition] = useTransition();

  // Offline, the answer couldn't be saved; the question waits for a
  // connection instead of trapping someone in it. Once "done" is on screen
  // it stays until closed, connection or not.
  const open = !answered && (isOnline || step === "done");

  function choose(visibility: "public" | "private", withHandle?: string) {
    if (!navigator.onLine) {
      setError(t.offline);
      return;
    }
    setError(null);
    setPending(visibility);
    startTransition(async () => {
      const result = await setVisibilityAction(
        visibility === "public" ? { visibility, handle: withHandle } : { visibility },
      );
      setPending(null);
      if (!result.success) {
        if (result.field === "handle") setStep("handle");
        setError(result.message);
        return;
      }
      if (visibility === "public") {
        setStep("done");
      } else {
        setAnswered(true);
        router.refresh();
      }
    });
  }

  const title =
    step === "handle" ? t.handleStepTitle : step === "done" ? t.doneTitle : isWelcome ? t.promptWelcomeTitle : t.promptTitle;

  return (
    <Modal open={open} title={title}>
      {step === "choose" && (
        <div className="mt-3 space-y-5">
          <p className="text-sm text-ink">{isWelcome ? t.promptWelcomeIntro : t.promptIntro}</p>
          <PublicProfileSummary />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              fullWidth
              disabled={pending !== null}
              onClick={() => (currentHandle ? choose("public") : setStep("handle"))}
            >
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
      )}

      {step === "handle" && (
        <form
          className="mt-3 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            choose("public", handle);
          }}
        >
          <p className="text-sm text-ink">{t.handleStepIntro}</p>
          <HandleField id="visibility-prompt-handle" value={handle} onChange={setHandle} error={error} />
          <div className="flex flex-col gap-2">
            <Button type="submit" fullWidth disabled={pending !== null || handle.length < 3}>
              <LoadingLabel loading={pending === "public"}>{t.makePublic}</LoadingLabel>
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={pending !== null}
              onClick={() => {
                setError(null);
                setStep("choose");
              }}
            >
              {dict.common.back}
            </Button>
          </div>
        </form>
      )}

      {step === "done" && (
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
      )}
    </Modal>
  );
}
