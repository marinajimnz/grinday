// Client-side brew draft: exists only in this browser's localStorage until
// the shot is saved for real (features/attempts/actions.createAttemptAction).
// This is what makes "if the network fails after the shot, the draft isn't
// lost" true — nothing here ever depends on a network round trip.

import type { BrewMethod } from "@/features/equipment/constants";
import type { AttemptMediaKind, CupCount } from "@/features/attempts/constants";
import { getRecipeFieldConfig } from "@/features/brew/recipeFieldConfig";

export type BrewDraftRecipe = {
  method?: BrewMethod;
  doseG?: number;
  waterG?: number;
  // Aeropress-only: water added after the brew to dilute it — kept apart
  // from waterG (the brew water) so both the brew ratio and the final
  // coffee/water ratio can be shown.
  dilutionWaterG?: number;
  targetWeightG?: number;
  temperatureC?: number;
  targetTimeMs?: number;
  mokaCupSize?: number;
  // Espresso only: one cup or two. A label on the shot, not a multiplier —
  // nothing else in the recipe moves when it changes.
  cupCount?: CupCount;
  heatIntensity?: "low" | "medium" | "high";
  equipmentId?: string;
  equipmentModelName?: string;
  grinderId?: string;
  grinderModelName?: string;
  // Optional dual-burr grinder configuration (e.g. Sage: one dial on the
  // grinder, one on the machine) — independent of each other, both 1-24.
  grinderUpperBurr?: number;
  grinderLowerBurr?: number;
  // Legacy Sage-only fields — no longer written by the live brew flow, kept
  // only so a draft already sitting in a browser's localStorage from before
  // this change still parses without throwing.
  grindSetting?: number;
  grindSeconds?: number;
  doseMode?: "auto" | "manual";
  basketSize?: "single" | "double";
  temperatureOffsetC?: number;
  upperBurrSetting?: number;
  shotMode?: "single" | "double" | "manual";
};

export type BrewDraftPostShot = {
  outputWeightG?: number;
  tdsPercent?: number;
  wouldBrewAgain?: boolean;
  acidity?: number;
  sweetness?: number;
  bitterness?: number;
  body?: number;
  intensity?: number;
  balance?: number;
  overallRating?: number;
  notes?: string;
  // Legacy Sage-only fields — same reasoning as BrewDraftRecipe above.
  doseFeedback?: "under" | "ideal" | "over" | "unknown";
  inputWeightG?: number;
};

// A photo taken during the photo step — already uploaded to Storage (under
// the draft's own folder, since there's no attempt id to file it under yet),
// so only the path travels in the draft. It becomes an attempt_media row the
// moment the attempt is created.
export type BrewDraftPhoto = {
  kind: AttemptMediaKind;
  storagePath: string;
};

export type BrewDraft = {
  draftId: string;
  // Who this draft belongs to — lets the dashboard's resume banner ignore
  // leftover drafts from a different account on a shared device instead of
  // offering to "continue" someone else's brew.
  userId?: string;
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  parentAttemptId?: string;
  parentAttemptNo?: number;
  recipe: BrewDraftRecipe;
  // When the current run began; null whenever the clock isn't moving,
  // which is both "never started" and "paused".
  startedAtEpochMs: number | null;
  // Time banked by earlier runs, so a pause doesn't throw away what was
  // already on the clock. Absent on drafts written before the timer could
  // pause, where it is simply zero. What tells "paused" apart from "never
  // started" is this being above zero — see hasTimerRun.
  accumulatedMs?: number;
  stoppedAtEpochMs: number | null;
  extractionMs: number | null;
  // Photos of the coffee, taken right after the timer stops and before it's
  // tasted — that's the only moment the crema/pour still looks like it did
  // when it came out of the machine, so the photo step comes before the
  // result step, not after it.
  photos?: BrewDraftPhoto[];
  // Whether the photo step has been passed (with or without a photo). The
  // result step is only reachable once it has, so a reload mid-brew comes
  // back to the same step instead of skipping straight to the rating.
  photoStepDone?: boolean;
  postShot: BrewDraftPostShot;
  createdAt: number;
  // How many times the user has re-entered this draft after already reaching
  // the result step once (i.e. via the dashboard's "Continuar", a direct
  // link, or a reload). 0/undefined means the result step has never been
  // left-and-resumed yet, so leaving it again is still a first offense.
  resumeCount?: number;
};

const KEY_PREFIX = "grinday:brew-draft:";

function key(draftId: string) {
  return `${KEY_PREFIX}${draftId}`;
}

// Only a draft left behind after the timer stopped (stoppedAtEpochMs set —
// i.e. at the photo or the result step) counts as resumable; leaving
// mid-recipe or mid-timer means the shot never actually happened, so
// there's nothing worth offering to continue.
// Autosaved on every change either way, but this filter is what keeps a
// still-in-progress recipe/timer draft from ever surfacing on the
// dashboard. Scoped to the current user — localStorage is shared by the
// browser, not the account, so a draft with no matching userId (or a
// different one) never surfaces here.
export function getMostRecentDraft(currentUserId: string): BrewDraft | null {
  try {
    const drafts = Object.keys(localStorage)
      .filter((k) => k.startsWith(KEY_PREFIX))
      .map((k) => k.slice(KEY_PREFIX.length))
      .map(loadDraft)
      .filter(
        (d): d is BrewDraft =>
          d !== null && d.userId === currentUserId && d.stoppedAtEpochMs !== null,
      );
    if (drafts.length === 0) return null;
    return drafts.reduce((latest, d) => (d.createdAt > latest.createdAt ? d : latest));
  } catch (err) {
    console.error("[brew-draft] failed to list drafts:", err);
    return null;
  }
}

// Whether the clock has been running at all: moving right now, or stopped
// with time banked. The distinction matters because "Guardar sin
// cronometrar" throws the timing away without a confirm, so it belongs to
// the state where there is no timing to lose — and after a pause there is.
export function hasTimerRun(draft: Pick<BrewDraft, "startedAtEpochMs" | "accumulatedMs">) {
  return draft.startedAtEpochMs !== null || (draft.accumulatedMs ?? 0) > 0;
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
  method: string;
  dose_g: number | null;
  water_g: number | null;
  dilution_water_g: number | null;
  target_weight_g: number | null;
  temperature_c: number | null;
  target_time_ms: number | null;
  grind_setting: number | null;
  grinder_upper_burr: number | null;
  grinder_lower_burr: number | null;
  moka_cup_size: number | null;
  cup_count: number | null;
  heat_intensity: string | null;
  equipment_id: string | null;
  grinder_id: string | null;
  equipment_snapshot: unknown;
};

function cupCountFrom(value: number | null | undefined): CupCount | undefined {
  return value === 1 || value === 2 ? value : undefined;
}

type SnapshotNames = { equipmentModelName?: string; grinderModelName?: string };

function namesFromSnapshot(snapshot: unknown): SnapshotNames {
  if (!snapshot || typeof snapshot !== "object") return {};
  const s = snapshot as Record<string, unknown>;
  return {
    equipmentModelName: typeof s.equipment_model_name === "string" ? s.equipment_model_name : undefined,
    grinderModelName: typeof s.grinder_model_name === "string" ? s.grinder_model_name : undefined,
  };
}

export type DefaultEquipment = { id: string; model_name: string } | null;
export type DefaultGrinder = { id: string; model_name: string } | null;

// First-ever recipe for a given coffee+method (no prior attempt to recall
// from) starts from these instead of a blank card grid.
const FIRST_TIME_DEFAULTS = {
  doseG: 20,
  waterG: 320,
  targetWeightG: 40,
  temperatureC: 94,
  targetTimeMs: 27000,
};

export function buildDraftFromRecipe(params: {
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  method: BrewMethod;
  userId?: string;
  sourceAttempt?: RecipeSourceAttempt | null;
  defaultEquipment?: DefaultEquipment;
  defaultGrinder?: DefaultGrinder;
}): BrewDraft {
  const p = params.sourceAttempt;
  const names = namesFromSnapshot(p?.equipment_snapshot);
  // Nothing to recall yet — seed the card grid with sane defaults instead of
  // leaving every card blank, but only for the fields this method actually
  // shows.
  const isFirstTime = !p;
  const config = getRecipeFieldConfig(params.method);
  return {
    draftId: createDraftId(),
    userId: params.userId,
    coffeeId: params.coffeeId,
    coffeeBagId: params.coffeeBagId,
    coffeeName: params.coffeeName,
    roaster: params.roaster,
    parentAttemptId: p?.id,
    parentAttemptNo: p?.attempt_no,
    recipe: {
      method: params.method,
      doseG: p?.dose_g ?? (isFirstTime ? FIRST_TIME_DEFAULTS.doseG : undefined),
      waterG: p?.water_g ?? (isFirstTime && config.hasWater ? FIRST_TIME_DEFAULTS.waterG : undefined),
      dilutionWaterG: p?.dilution_water_g ?? undefined,
      targetWeightG:
        p?.target_weight_g ?? (isFirstTime && config.brewWeightMode !== "hidden" ? FIRST_TIME_DEFAULTS.targetWeightG : undefined),
      temperatureC: p?.temperature_c ?? (isFirstTime ? FIRST_TIME_DEFAULTS.temperatureC : undefined),
      targetTimeMs: p?.target_time_ms ?? (isFirstTime ? FIRST_TIME_DEFAULTS.targetTimeMs : undefined),
      grinderUpperBurr: p?.grinder_upper_burr ?? undefined,
      grinderLowerBurr: p?.grinder_lower_burr ?? undefined,
      mokaCupSize: p?.moka_cup_size ?? undefined,
      // Pre-selected rather than left blank, like every other proposal on
      // this step: one cup is what an espresso is unless you say otherwise,
      // and the twenty-five attempts logged before the column existed have
      // nothing to recall.
      cupCount: cupCountFrom(p?.cup_count) ?? (config.hasCupCount ? 1 : undefined),
      heatIntensity: (p?.heat_intensity as BrewDraftRecipe["heatIntensity"]) ?? undefined,
      equipmentId: params.defaultEquipment?.id ?? p?.equipment_id ?? undefined,
      equipmentModelName: params.defaultEquipment?.model_name ?? names.equipmentModelName,
      grinderId: params.defaultGrinder?.id ?? p?.grinder_id ?? undefined,
      grinderModelName: params.defaultGrinder?.model_name ?? names.grinderModelName,
    },
    startedAtEpochMs: null,
    accumulatedMs: 0,
    stoppedAtEpochMs: null,
    extractionMs: null,
    photos: [],
    photoStepDone: false,
    postShot: {},
    createdAt: Date.now(),
  };
}
