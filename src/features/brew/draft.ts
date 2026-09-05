// Client-side brew draft: exists only in this browser's localStorage until
// the shot is saved for real (features/attempts/actions.createAttemptAction).
// This is what makes "if the network fails after the shot, the draft isn't
// lost" true — nothing here ever depends on a network round trip.

import type { BrewMethod } from "@/features/equipment/constants";

export type BrewDraftRecipe = {
  method?: BrewMethod;
  doseG?: number;
  waterG?: number;
  targetWeightG?: number;
  temperatureC?: number;
  targetTimeMs?: number;
  mokaCupSize?: number;
  heatIntensity?: "low" | "medium" | "high";
  equipmentId?: string;
  equipmentModelName?: string;
  grinderId?: string;
  grinderModelName?: string;
  grindSetting?: number;
  // Legacy Sage-only fields — no longer written by the live brew flow, kept
  // only so a draft already sitting in a browser's localStorage from before
  // this change still parses without throwing.
  grindSeconds?: number;
  doseMode?: "auto" | "manual";
  basketSize?: "single" | "double";
  temperatureOffsetC?: number;
  upperBurrSetting?: number;
  shotMode?: "single" | "double" | "manual";
  preinfusionMs?: number;
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
  usedBitMore?: boolean;
  pressureObservation?: "low" | "espresso_range" | "high" | "unknown";
  inputWeightG?: number;
  outputVolumeMl?: number;
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
  method: string;
  dose_g: number | null;
  water_g: number | null;
  target_weight_g: number | null;
  temperature_c: number | null;
  target_time_ms: number | null;
  grind_setting: number | null;
  moka_cup_size: number | null;
  heat_intensity: string | null;
  equipment_id: string | null;
  grinder_id: string | null;
  equipment_snapshot: unknown;
};

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

export function buildDraftFromRecipe(params: {
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  method: BrewMethod;
  sourceAttempt?: RecipeSourceAttempt | null;
  defaultEquipment?: DefaultEquipment;
  defaultGrinder?: DefaultGrinder;
}): BrewDraft {
  const p = params.sourceAttempt;
  const names = namesFromSnapshot(p?.equipment_snapshot);
  return {
    draftId: createDraftId(),
    coffeeId: params.coffeeId,
    coffeeBagId: params.coffeeBagId,
    coffeeName: params.coffeeName,
    roaster: params.roaster,
    parentAttemptId: p?.id,
    parentAttemptNo: p?.attempt_no,
    recipe: {
      method: params.method,
      doseG: p?.dose_g ?? undefined,
      waterG: p?.water_g ?? undefined,
      targetWeightG: p?.target_weight_g ?? undefined,
      temperatureC: p?.temperature_c ?? undefined,
      targetTimeMs: p?.target_time_ms ?? undefined,
      grindSetting: p?.grind_setting ?? undefined,
      mokaCupSize: p?.moka_cup_size ?? undefined,
      heatIntensity: (p?.heat_intensity as BrewDraftRecipe["heatIntensity"]) ?? undefined,
      equipmentId: params.defaultEquipment?.id ?? p?.equipment_id ?? undefined,
      equipmentModelName: params.defaultEquipment?.model_name ?? names.equipmentModelName,
      grinderId: params.defaultGrinder?.id ?? p?.grinder_id ?? undefined,
      grinderModelName: params.defaultGrinder?.model_name ?? names.grinderModelName,
    },
    startedAtEpochMs: null,
    stoppedAtEpochMs: null,
    extractionMs: null,
    postShot: {},
    createdAt: Date.now(),
  };
}
