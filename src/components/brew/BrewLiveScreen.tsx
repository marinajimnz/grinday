"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CupSoda } from "lucide-react";
import { IconFavorita } from "@/components/icons/pencil-icons";
import { BrewStepHeader } from "./BrewStepHeader";
import { TimerStage } from "./TimerStage";
import { RecipeFields } from "./RecipeFields";
import { BrewResultFields } from "./BrewResultFields";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type BrewDraft,
  type BrewDraftPostShot,
  type BrewDraftRecipe,
} from "@/features/brew/draft";
import type { BrewMethod } from "@/features/equipment/constants";
import { createAttemptAction } from "@/features/attempts/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";

export function BrewLiveScreen({ draftId }: { draftId: string }) {
  const router = useRouter();
  const dict = useDictionary();
  const [draft, setDraft] = useState<BrewDraft | null | undefined>(undefined);
  const [showTimer, setShowTimer] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this can only run client-side
    // after mount — there's no way to derive this as render-time state.
    const loaded = loadDraft(draftId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loaded);
    if (loaded && (loaded.startedAtEpochMs !== null || loaded.stoppedAtEpochMs !== null)) {
      setShowTimer(true);
    }
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
          method: draft.recipe.method,
          doseG: draft.recipe.doseG,
          waterG: draft.recipe.waterG,
          dilutionWaterG: draft.recipe.dilutionWaterG,
          targetWeightG: draft.recipe.targetWeightG,
          temperatureC: draft.recipe.temperatureC,
          targetTimeMs: draft.recipe.targetTimeMs,
          mokaCupSize: draft.recipe.mokaCupSize,
          heatIntensity: draft.recipe.heatIntensity,
          equipmentId: draft.recipe.equipmentId,
          grinderId: draft.recipe.grinderId,
          equipmentModelName: draft.recipe.equipmentModelName,
          grinderModelName: draft.recipe.grinderModelName,
          grindSetting: draft.recipe.grindSetting,
          extractionMs: draft.extractionMs ?? undefined,
          outputWeightG: draft.postShot.outputWeightG,
          tdsPercent: draft.postShot.tdsPercent,
          wouldBrewAgain: draft.postShot.wouldBrewAgain,
          usedBitMore: false,
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

  const saveStatus = pendingSync ? (
    <p role="status" className="text-sm text-ink-muted">
      {dict.brew.offlinePending} — <strong className="text-ink">{dict.brew.offlinePendingStrong}</strong>
      {dict.brew.offlinePendingRest}
    </p>
  ) : (
    saveError && (
      <p role="alert" className="text-sm text-red-700">
        {saveError} {dict.brew.savedLocallyRetry}
      </p>
    )
  );

  if (draft === undefined) return null; // avoid a flash before localStorage read

  if (draft === null) {
    return (
      <EmptyState
        icon={CupSoda}
        title={dict.brew.draftGoneTitle}
        description={dict.brew.draftGoneDescription}
        action={
          <Link
            href="/brew/new"
            className="mt-2 inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
          >
            {dict.brew.backToBrew}
          </Link>
        }
      />
    );
  }

  const method: BrewMethod = (draft.recipe.method as BrewMethod) ?? "espresso";
  const isReview = draft.stoppedAtEpochMs !== null;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted">{draft.roaster}</p>
          <h1 className="font-display text-2xl text-ink">{draft.coffeeName}</h1>
        </div>
        <span className="mt-0.5 shrink-0 rounded-full bg-canvas px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
          {dict.equipment.methodLabels[method]}
        </span>
      </div>
      {draft.parentAttemptNo && (
        <p className="mt-1 flex items-center gap-1 text-sm text-coffee">
          <IconFavorita aria-hidden className="size-3.5 text-coffee" />
          {dict.brew.basedOnAttempt} #{draft.parentAttemptNo}
        </p>
      )}

      {!isReview && !showTimer && (
        <div className="mt-6">
          <BrewStepHeader step={3} title={dict.brew.stepRecipeTitle} />
          <p className="mt-1 text-sm text-ink-muted">{dict.brew.recipeRememberedNote}</p>
          <div className="mt-6 space-y-6">
            <RecipeFields value={draft.recipe} onChange={updateRecipe} />
            <button
              type="button"
              onClick={() => setShowTimer(true)}
              className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface"
            >
              {dict.common.next}
            </button>
          </div>
        </div>
      )}

      {!isReview && showTimer && (
        <div className="mt-6 space-y-6">
          <BrewStepHeader step={4} title={dict.brew.stepTimerTitle} />
          {draft.startedAtEpochMs === null && (
            <button
              type="button"
              onClick={() => setShowTimer(false)}
              className="min-h-11 rounded-input border border-border px-4 text-sm font-medium text-ink"
            >
              {dict.common.back}
            </button>
          )}
          <TimerStage
            method={method}
            targetTimeMs={draft.recipe.targetTimeMs}
            startedAtEpochMs={draft.startedAtEpochMs}
            onStart={handleStart}
            onStop={handleStop}
          />

          {saveStatus}

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="min-h-11 w-full rounded-input border border-border px-4 text-sm font-medium text-ink disabled:opacity-60"
          >
            <LoadingLabel loading={isSaving}>
              {pendingSync ? dict.brew.retryNow : saveError ? dict.common.retry : dict.brew.saveWithoutTimer}
            </LoadingLabel>
          </button>
        </div>
      )}

      {isReview && (
        <div className="mt-6 space-y-6">
          <BrewStepHeader step={5} title={dict.brew.stepResultTitle} />

          <BrewResultFields
            recipe={draft.recipe}
            onRecipeChange={updateRecipe}
            extractionMs={draft.extractionMs}
            onExtractionChange={(extractionMs) => persist({ ...draft, extractionMs })}
            value={draft.postShot}
            onChange={updatePostShot}
          />

          {saveStatus}

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60 sm:w-auto"
          >
            <LoadingLabel loading={isSaving}>
              {pendingSync ? dict.brew.retryNow : saveError ? dict.common.retry : dict.brew.saveRecipe}
            </LoadingLabel>
          </button>
        </div>
      )}
    </div>
  );
}
