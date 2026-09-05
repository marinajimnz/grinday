import { z } from "zod";
import {
  ATTEMPT_MEDIA_KINDS,
  BASKET_SIZES,
  DOSE_FEEDBACKS,
  DOSE_MODES,
  HEAT_INTENSITIES,
  PRESSURE_OBSERVATIONS,
  SHOT_MODES,
} from "@/features/attempts/constants";
import { BREW_METHODS } from "@/features/equipment/constants";
import { optionalEnum, optionalInt, optionalPositiveNumber, optionalRating } from "./shared";

export const attemptFieldsSchema = z.object({
  // Método + receta genérica (multi-method brew flow)
  method: optionalEnum(BREW_METHODS),
  doseG: optionalPositiveNumber,
  waterG: optionalPositiveNumber,
  targetWeightG: optionalPositiveNumber,
  temperatureC: optionalInt,
  targetTimeMs: optionalInt,
  tdsPercent: optionalPositiveNumber,
  wouldBrewAgain: z.boolean().optional(),
  mokaCupSize: optionalInt,
  heatIntensity: optionalEnum(HEAT_INTENSITIES),
  equipmentId: z.uuid().optional(),
  grinderId: z.uuid().optional(),
  // Display-only snapshot of the equipment names at brew time (survives the
  // equipment row later being renamed or deleted) — not their own columns.
  equipmentModelName: z.string().trim().max(200).optional(),
  grinderModelName: z.string().trim().max(200).optional(),

  // Molienda
  grindSetting: z.number("El molido es obligatorio").min(0),
  grindSeconds: optionalPositiveNumber,
  doseMode: optionalEnum(DOSE_MODES),
  doseFeedback: optionalEnum(DOSE_FEEDBACKS),
  usedBitMore: z.boolean().default(false),

  // Cesta (legado, solo espresso Sage)
  basketSize: optionalEnum(BASKET_SIZES),

  // Temperatura / muela (legado, solo espresso Sage)
  temperatureOffsetC: optionalInt,
  upperBurrSetting: optionalInt,

  // Extracción
  shotMode: optionalEnum(SHOT_MODES),
  extractionMs: optionalInt,
  preinfusionMs: optionalInt,
  pressureObservation: optionalEnum(PRESSURE_OBSERVATIONS),

  // Peso / volumen
  inputWeightG: optionalPositiveNumber,
  outputWeightG: optionalPositiveNumber,
  outputVolumeMl: optionalPositiveNumber,

  // Cata
  acidity: optionalRating,
  sweetness: optionalRating,
  bitterness: optionalRating,
  body: optionalRating,
  intensity: optionalRating,
  balance: optionalRating,
  overallRating: optionalRating,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const createAttemptSchema = z.object({
  coffeeBagId: z.uuid(),
  parentAttemptId: z.uuid().optional(),
  // The brew draft's own draftId, reused as an idempotency key so retrying a
  // save (manual "Reintentar" or auto-retry on reconnect) can never insert
  // the same attempt twice.
  idempotencyKey: z.uuid().optional(),
  attempt: attemptFieldsSchema,
});

export const updateAttemptSchema = z.object({
  attemptId: z.uuid(),
  attempt: attemptFieldsSchema,
});

export const setPreferredAttemptSchema = z.object({
  coffeeId: z.uuid(),
  attemptId: z.uuid().nullable(),
});

export const registerAttemptMediaSchema = z.object({
  attemptId: z.uuid(),
  kind: z.enum(ATTEMPT_MEDIA_KINDS).default("espresso"),
  storagePath: z.string().min(1),
  altText: z.string().trim().max(300).optional(),
});
