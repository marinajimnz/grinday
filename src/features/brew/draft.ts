// Client-side brew draft: exists only in this browser's localStorage until
// the shot is saved for real (features/attempts/actions.createAttemptAction).
// This is what makes "if the network fails after the shot, the draft isn't
// lost" true — nothing here ever depends on a network round trip.

export type BrewDraftRecipe = {
  grindSetting?: number;
  grindSeconds?: number;
  doseMode?: "auto" | "manual";
  basketSize?: "single" | "double";
  basketWall?: "single_wall" | "dual_wall";
  temperatureOffsetC?: number;
  upperBurrSetting?: number;
  shotMode?: "single" | "double" | "manual";
  preinfusionMs?: number;
};

export type BrewDraftPostShot = {
  doseFeedback?: "under" | "ideal" | "over" | "unknown";
  usedBitMore?: boolean;
  pressureObservation?: "low" | "espresso_range" | "high" | "unknown";
  inputWeightG?: number;
  outputWeightG?: number;
  outputVolumeMl?: number;
  acidity?: number;
  sweetness?: number;
  bitterness?: number;
  body?: number;
  intensity?: number;
  balance?: number;
  overallRating?: number;
  notes?: string;
};

export type BrewDraft = {
  draftId: string;
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  parentAttemptId?: string;
  parentAttemptNo?: number;
  recipe: BrewDraftRecipe;
  startedAtEpochMs: number | null;
  stoppedAtEpochMs: number | null;
  extractionMs: number | null;
  postShot: BrewDraftPostShot;
  createdAt: number;
};

function key(draftId: string) {
  return `grinday:brew-draft:${draftId}`;
}

export function createDraftId() {
  return crypto.randomUUID();
}

export function saveDraft(draft: BrewDraft) {
  try {
    localStorage.setItem(key(draft.draftId), JSON.stringify(draft));
  } catch (err) {
    console.error("[brew-draft] failed to save:", err);
  }
}

export function loadDraft(draftId: string): BrewDraft | null {
  try {
    const raw = localStorage.getItem(key(draftId));
    return raw ? (JSON.parse(raw) as BrewDraft) : null;
  } catch (err) {
    console.error("[brew-draft] failed to load:", err);
    return null;
  }
}

export function clearDraft(draftId: string) {
  try {
    localStorage.removeItem(key(draftId));
  } catch {
    // best-effort cleanup, not worth surfacing to the user
  }
}

export type RecipeSourceAttempt = {
  id: string;
  attempt_no: number;
  grind_setting: number | null;
  grind_seconds: number | null;
  dose_mode: string | null;
  basket_size: string | null;
  basket_wall: string | null;
  temperature_offset_c: number | null;
  upper_burr_setting: number | null;
  shot_mode: string | null;
  preinfusion_ms: number | null;
};

export function buildDraftFromRecipe(params: {
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  sourceAttempt?: RecipeSourceAttempt | null;
}): BrewDraft {
  const p = params.sourceAttempt;
  return {
    draftId: createDraftId(),
    coffeeId: params.coffeeId,
    coffeeBagId: params.coffeeBagId,
    coffeeName: params.coffeeName,
    roaster: params.roaster,
    parentAttemptId: p?.id,
    parentAttemptNo: p?.attempt_no,
    recipe: p
      ? {
          grindSetting: p.grind_setting ?? undefined,
          grindSeconds: p.grind_seconds ?? undefined,
          doseMode: (p.dose_mode as BrewDraftRecipe["doseMode"]) ?? undefined,
          basketSize: (p.basket_size as BrewDraftRecipe["basketSize"]) ?? undefined,
          basketWall: (p.basket_wall as BrewDraftRecipe["basketWall"]) ?? undefined,
          temperatureOffsetC: p.temperature_offset_c ?? undefined,
          upperBurrSetting: p.upper_burr_setting ?? undefined,
          shotMode: (p.shot_mode as BrewDraftRecipe["shotMode"]) ?? undefined,
          preinfusionMs: p.preinfusion_ms ?? undefined,
        }
      : {},
    startedAtEpochMs: null,
    stoppedAtEpochMs: null,
    extractionMs: null,
    postShot: {},
    createdAt: Date.now(),
  };
}
