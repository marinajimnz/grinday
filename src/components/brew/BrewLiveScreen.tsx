"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CupSoda, Star } from "lucide-react";
import { TimerStage } from "./TimerStage";
import { MiseEnPlaceFields } from "./MiseEnPlaceFields";
import { PostShotFields } from "./PostShotFields";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type BrewDraft,
  type BrewDraftPostShot,
  type BrewDraftRecipe,
} from "@/features/brew/draft";
import { createAttemptAction } from "@/features/attempts/actions";
import { EmptyState } from "@/components/ui/EmptyState";

export function BrewLiveScreen({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BrewDraft | null | undefined>(undefined);
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this can only run client-side
    // after mount — there's no way to derive this as render-time state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadDraft(draftId));
  }, [draftId]);

  function persist(next: BrewDraft) {
    setDraft(next);
    saveDraft(next);
  }

  function updateRecipe(recipe: BrewDraftRecipe) {
    if (!draft) return;
    persist({ ...draft, recipe });
  }

  function updatePostShot(postShot: BrewDraftPostShot) {
    if (!draft) return;
    persist({ ...draft, postShot });
  }

  function handleStart() {
    if (!draft) return;
    persist({ ...draft, startedAtEpochMs: Date.now() });
  }

  function handleStop(elapsedMs: number) {
    if (!draft) return;
    persist({ ...draft, stoppedAtEpochMs: Date.now(), extractionMs: Math.round(elapsedMs) });
  }

  function handleSave() {
    if (!draft) return;
    setSaveError(null);

    // No point even trying the request offline — go straight to "pendiente
    // de sincronizar" and let the online-event listener below retry once
    // connectivity actually returns (Fase 7 §11.2).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPendingSync(true);
      return;
    }

    startSaving(async () => {
      const result = await createAttemptAction({
        coffeeBagId: draft.coffeeBagId,
        parentAttemptId: draft.parentAttemptId,
        // The draft's own id doubles as the idempotency key: a retried save
        // (this listener, or the manual button) can never create a
        // duplicate attempt — see createAttemptAction.
        idempotencyKey: draft.draftId,
        attempt: {
          grindSetting: draft.recipe.grindSetting,
          grindSeconds: draft.recipe.grindSeconds,
          doseMode: draft.recipe.doseMode,
          basketSize: draft.recipe.basketSize,
          basketWall: draft.recipe.basketWall,
          temperatureOffsetC: draft.recipe.temperatureOffsetC,
          upperBurrSetting: draft.recipe.upperBurrSetting,
          shotMode: draft.recipe.shotMode,
          preinfusionMs: draft.recipe.preinfusionMs,
          extractionMs: draft.extractionMs ?? undefined,
          usedBitMore: draft.postShot.usedBitMore ?? false,
          doseFeedback: draft.postShot.doseFeedback,
          pressureObservation: draft.postShot.pressureObservation,
          inputWeightG: draft.postShot.inputWeightG,
          outputWeightG: draft.postShot.outputWeightG,
          outputVolumeMl: draft.postShot.outputVolumeMl,
          acidity: draft.postShot.acidity,
          sweetness: draft.postShot.sweetness,
          bitterness: draft.postShot.bitterness,
          body: draft.postShot.body,
          intensity: draft.postShot.intensity,
          balance: draft.postShot.balance,
          overallRating: draft.postShot.overallRating,
          notes: draft.postShot.notes,
        },
      });

      if (!result.success) {
        // Never clear the draft on failure — it's the only copy of this shot
        // until the save actually succeeds. A failed fetch (not a rejected
        // request) usually means we just lost connectivity mid-save.
        setPendingSync(typeof navigator !== "undefined" && !navigator.onLine);
        setSaveError(result.message);
        return;
      }

      setPendingSync(false);
      clearDraft(draftId);
      router.push(`/attempts/${result.data.attemptId}`);
    });
  }

  // Auto-sync once: when connectivity returns, retry a save that's pending
  // — no need for the user to notice and tap "Reintentar" themselves.
  useEffect(() => {
    if (!pendingSync) return;
    function onOnline() {
      handleSave();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSync, draft]);

  if (draft === undefined) return null; // avoid a flash before localStorage read

  if (draft === null) {
    return (
      <EmptyState
        icon={CupSoda}
        title="Este borrador ya no existe"
        description="Puede que se haya guardado en otro dispositivo o que se haya limpiado el almacenamiento local. Empieza uno nuevo."
        action={
          <Link
            href="/brew/new"
            className="mt-2 inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
          >
            Volver a Preparar
          </Link>
        }
      />
    );
  }

  const isReview = draft.stoppedAtEpochMs !== null;

  return (
    <div>
      <p className="text-xs text-ink-muted">{draft.roaster}</p>
      <h1 className="font-display text-2xl text-ink">{draft.coffeeName}</h1>
      {draft.parentAttemptNo && (
        <p className="mt-1 flex items-center gap-1 text-sm text-coffee">
          <Star aria-hidden className="size-3.5 fill-coffee" />
          Basado en intento #{draft.parentAttemptNo}
        </p>
      )}

      {!isReview && (
        <div className="mt-6 space-y-8">
          <MiseEnPlaceFields value={draft.recipe} onChange={updateRecipe} />
          <TimerStage
            startedAtEpochMs={draft.startedAtEpochMs}
            onStart={handleStart}
            onStop={handleStop}
          />
        </div>
      )}

      {isReview && (
        <div className="mt-6 space-y-8">
          <div className="rounded-card border border-border bg-surface p-5 text-center">
            <p className="text-xs text-ink-muted">Extracción</p>
            <p className="font-display text-4xl tabular-nums text-ink">
              {((draft.extractionMs ?? 0) / 1000).toFixed(1)}s
            </p>
          </div>

          <PostShotFields value={draft.postShot} onChange={updatePostShot} />

          {pendingSync ? (
            <p role="status" className="text-sm text-ink-muted">
              Sin conexión — <strong className="text-ink">Pendiente de sincronizar</strong>. El
              intento está guardado en este dispositivo y se enviará solo en cuanto vuelva la red.
            </p>
          ) : (
            saveError && (
              <p role="alert" className="text-sm text-red-700">
                {saveError} El borrador sigue guardado en este dispositivo — puedes reintentar.
              </p>
            )
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60 sm:w-auto"
          >
            {isSaving
              ? "Guardando..."
              : pendingSync
                ? "Reintentar ahora"
                : saveError
                  ? "Reintentar"
                  : "Guardar intento"}
          </button>
        </div>
      )}
    </div>
  );
}
