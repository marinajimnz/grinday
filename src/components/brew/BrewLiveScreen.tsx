"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CupSoda } from "lucide-react";
import { IconFavorita } from "@/components/icons/pencil-icons";
import { TimerStage } from "./TimerStage";
import { RecipeFields } from "./RecipeFields";
import { BrewPhotoStage } from "./BrewPhotoStage";
import { BrewResultFields } from "./BrewResultFields";
import {
  clearDraft,
  hasTimerRun,
  loadDraft,
  saveDraft,
  type BrewDraft,
  type BrewDraftPhoto,
  type BrewDraftPostShot,
  type BrewDraftRecipe,
} from "@/features/brew/draft";
import type { BrewMethod } from "@/features/equipment/constants";
import { createAttemptAction } from "@/features/attempts/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/ui/StepHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useConfirmBeforeLeaving } from "./useConfirmBeforeLeaving";

export function BrewLiveScreen({ draftId }: { draftId: string }) {
  const router = useRouter();
  const dict = useDictionary();
  const [draft, setDraft] = useState<BrewDraft | null | undefined>(undefined);
  const [showTimer, setShowTimer] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);

  // Only the timer step risks losing something on an accidental exit — the
  // recipe step has nothing running yet, and the photo and result steps
  // already have their own leave-and-decide-later flow (see the dashboard's
  // draft banner).
  const isTimerStep = showTimer && draft != null && draft.stoppedAtEpochMs === null;
  const leaveGuard = useConfirmBeforeLeaving(isTimerStep);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this can only run client-side
    // after mount — there's no way to derive this as render-time state.
    let loaded = loadDraft(draftId);
    // A draft written before the photo step existed has no `photos` key at
    // all. If it's already past the timer, its coffee was brewed (and by now
    // drunk) long before there was anything to photograph — send it straight
    // to the result step instead of asking for a photo that can't be taken
    // anymore.
    if (loaded && loaded.photos === undefined && loaded.stoppedAtEpochMs !== null) {
      loaded = { ...loaded, photos: [], photoStepDone: true };
    }
    // Finding the timer already stopped on a fresh mount means the user is
    // re-entering the photo or result step — via the dashboard's
    // "Continuar", a direct link, or a reload — rather than arriving there
    // for the first time in this session. Bump resumeCount so that if it's
    // left again, the dashboard prompts to keep-or-discard instead of just
    // offering to resume silently a second time.
    if (loaded && loaded.stoppedAtEpochMs !== null) {
      loaded = { ...loaded, resumeCount: (loaded.resumeCount ?? 0) + 1 };
      saveDraft(loaded);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loaded);
    if (loaded && (hasTimerRun(loaded) || loaded.stoppedAtEpochMs !== null)) {
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

  function updatePhotos(photos: BrewDraftPhoto[]) {
    if (!draft) return;
    persist({ ...draft, photos });
  }

  function handleStart() {
    if (!draft) return;
    persist({ ...draft, startedAtEpochMs: Date.now() });
  }

  // Bank what this run added and stop the clock. startedAtEpochMs going
  // back to null is what "not running" means; accumulatedMs above zero is
  // what tells a pause apart from a brew that never started.
  function handlePause(elapsedMs: number) {
    if (!draft) return;
    persist({
      ...draft,
      accumulatedMs: (draft.accumulatedMs ?? 0) + Math.round(elapsedMs),
      startedAtEpochMs: null,
    });
  }

  function handleReset() {
    if (!draft) return;
    persist({
      ...draft,
      accumulatedMs: 0,
      startedAtEpochMs: null,
      stoppedAtEpochMs: null,
      extractionMs: null,
    });
  }

  function handleStop(elapsedMs: number) {
    if (!draft) return;
    persist({ ...draft, stoppedAtEpochMs: Date.now(), extractionMs: Math.round(elapsedMs) });
  }

  // Not timing a brew is a choice about the clock, not about the rest of
  // it: the coffee still got made, it still wants a photo and it still
  // wants tasting. This used to save the attempt outright from the timer
  // step, which dropped you on the attempt page having never been asked
  // what it tasted like — the one thing a journal is for. So it ends the
  // brew the way "Parar" does, minus a reading, and the same photo and
  // result steps follow. extractionMs stays null and the result step
  // offers it as a field, so a time remembered afterwards can still go in.
  function handleSkipTimer() {
    if (!draft) return;
    persist({ ...draft, stoppedAtEpochMs: Date.now(), extractionMs: null });
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
        // Photos from the photo step: uploaded while the coffee still looked
        // good, waiting for this attempt to exist so they can be attached to
        // it.
        media: draft.photos ?? [],
        attempt: {
          method: draft.recipe.method,
          doseG: draft.recipe.doseG,
          waterG: draft.recipe.waterG,
          dilutionWaterG: draft.recipe.dilutionWaterG,
          targetWeightG: draft.recipe.targetWeightG,
          temperatureC: draft.recipe.temperatureC,
          targetTimeMs: draft.recipe.targetTimeMs,
          mokaCupSize: draft.recipe.mokaCupSize,
          cupCount: draft.recipe.cupCount,
          heatIntensity: draft.recipe.heatIntensity,
          equipmentId: draft.recipe.equipmentId,
          grinderId: draft.recipe.grinderId,
          equipmentModelName: draft.recipe.equipmentModelName,
          grinderModelName: draft.recipe.grinderModelName,
          grinderUpperBurr: draft.recipe.grinderUpperBurr,
          grinderLowerBurr: draft.recipe.grinderLowerBurr,
          extractionMs: draft.extractionMs ?? undefined,
          outputWeightG: draft.postShot.outputWeightG ?? draft.recipe.targetWeightG,
          tdsPercent: draft.postShot.tdsPercent,
          wouldBrewAgain: draft.postShot.wouldBrewAgain,
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
      <p role="alert" className="text-sm text-danger">
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
          <Button href="/brew/new" className="mt-2">
            {dict.brew.backToBrew}
          </Button>
        }
      />
    );
  }

  const method: BrewMethod = (draft.recipe.method as BrewMethod) ?? "espresso";
  // Once the timer stops the coffee is made but not tasted yet, so the photo
  // step comes first; the result step only opens after it's been passed.
  const brewFinished = draft.stoppedAtEpochMs !== null;
  const timerHasRun = hasTimerRun(draft);
  const isPhotoStep = brewFinished && !draft.photoStepDone;
  const isReview = brewFinished && draft.photoStepDone === true;
  const photos = draft.photos ?? [];

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

      {!brewFinished && !showTimer && (
        <div className="mt-6">
          <StepHeader step={3} name={dict.brew.stepNameRecipe} heading={dict.brew.stepRecipeTitle} />
          <p className="mt-1 text-sm text-ink-muted">{dict.brew.recipeRememberedNote}</p>
          <div className="mt-6 space-y-6">
            <RecipeFields value={draft.recipe} onChange={updateRecipe} />
            <Button type="button" onClick={() => setShowTimer(true)} fullWidth>
              {dict.common.next}
            </Button>
          </div>
        </div>
      )}

      {!brewFinished && showTimer && (
        <div className="mt-6 space-y-6">
          {/* Going back re-opens the recipe, which the clock's reading was
              taken against — so the way back closes as soon as there is a
              reading, exactly like "Guardar sin cronometrar" below. */}
          <StepHeader
            step={4}
            name={dict.brew.stepTimerTitle}
            onBack={timerHasRun ? undefined : () => setShowTimer(false)}
          />
          <TimerStage
            targetTimeMs={draft.recipe.targetTimeMs}
            startedAtEpochMs={draft.startedAtEpochMs}
            accumulatedMs={draft.accumulatedMs}
            onStart={handleStart}
            onPause={handlePause}
            onStop={handleStop}
            onReset={handleReset}
          />

          {/* Full-width, directly under "Parar", and it ends the brew —
              while the shot is running that's a wet thumb away from
              throwing the timing away with no confirm and no undo. It's
              for a brew you never timed, so it belongs to the state where
              there is no timing to lose, exactly like "Volver" above.
              Pausing does not put it back: a paused clock is holding a
              reading, which is precisely what this would discard. Nothing
              is saved here any more, so the offline retry that used to
              share this button lives only on the result step now. */}
          {!timerHasRun && (
            <Button type="button" variant="secondary" onClick={handleSkipTimer} fullWidth>
              {dict.brew.skipTimer}
            </Button>
          )}
        </div>
      )}

      {isPhotoStep && (
        <div className="mt-6 space-y-6">
          <StepHeader step={5} name={dict.brew.stepPhotoTitle} />

          <BrewPhotoStage draftId={draft.draftId} photos={photos} onChange={updatePhotos} />

          <Button
            type="button"
            onClick={() => persist({ ...draft, photoStepDone: true })}
            fullWidth
          >
            {photos.length > 0 ? dict.common.next : dict.brew.continueWithoutPhoto}
          </Button>
        </div>
      )}

      {isReview && (
        <div className="mt-6 space-y-6">
          <StepHeader
            step={6}
            name={dict.brew.stepResultTitle}
            onBack={() => persist({ ...draft, photoStepDone: false })}
            backLabel={dict.brew.backToPhoto}
          />

          <BrewResultFields
            recipe={draft.recipe}
            onRecipeChange={updateRecipe}
            extractionMs={draft.extractionMs}
            onExtractionChange={(extractionMs) => persist({ ...draft, extractionMs })}
            value={draft.postShot}
            onChange={updatePostShot}
          />

          {saveStatus}

          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            fullWidth
            className="sm:w-auto"
          >
            <LoadingLabel loading={isSaving}>
              {pendingSync ? dict.brew.retryNow : saveError ? dict.common.retry : dict.brew.saveRecipe}
            </LoadingLabel>
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={leaveGuard.open}
        message={dict.brew.confirmLeaveTimer}
        onConfirm={leaveGuard.confirmLeave}
        onCancel={leaveGuard.cancelLeave}
      />
    </div>
  );
}
