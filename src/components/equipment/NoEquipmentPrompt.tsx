"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/components/i18n/LocaleProvider";

const DISMISS_KEY = "grindaily:equipment-prompt-dismissed";

type Stage = "hidden" | "ask" | "later";

export function NoEquipmentPrompt({ hasEquipment }: { hasEquipment: boolean }) {
  const router = useRouter();
  const dict = useDictionary();
  const [stage, setStage] = useState<Stage>("hidden");

  useEffect(() => {
    if (hasEquipment) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Private browsing / storage disabled — just skip the nudge.
    }
    // sessionStorage doesn't exist during SSR/prerender — this can only be
    // read client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage("ask");
  }, [hasEquipment]);

  useEffect(() => {
    if (stage === "hidden") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (stage === "ask") dismissForSession();
      setStage(stage === "ask" ? "later" : "hidden");
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [stage]);

  function dismissForSession() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (stage === "hidden") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-lg"
      >
        {stage === "ask" ? (
          <>
            <p className="text-center text-sm text-ink">{dict.equipment.promptMessage}</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissForSession();
                  setStage("later");
                }}
                className="min-h-11 flex-1 rounded-input border border-border px-4 text-sm font-medium text-ink"
              >
                {dict.equipment.promptLater}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissForSession();
                  router.push("/settings/machines/new");
                }}
                className="min-h-11 flex-1 rounded-input bg-ink px-4 text-sm font-medium text-surface"
              >
                {dict.equipment.promptConfirm}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-ink">{dict.equipment.promptLaterInfo}</p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setStage("hidden")}
                className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface"
              >
                {dict.equipment.promptLaterDismiss}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
