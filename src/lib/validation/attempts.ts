import { z } from "zod";
import {
  ATTEMPT_MEDIA_KINDS,
  BASKET_SIZES,
  MAX_CUP_COUNT,
  DOSE_FEEDBACKS,
  DOSE_MODES,
  HEAT_INTENSITIES,
  SHOT_MODES,
} from "@/features/attempts/constants";
import { BREW_METHODS } from "@/features/equipment/constants";
import {
  optionalBurrSetting,
  optionalEnum,
  optionalInt,
  optionalNonNegativeNumber,
  optionalPositiveNumber,
  optionalRating,
} from "./shared";

export const attemptFieldsSchema = z.object({
  // Método + receta genérica (multi-method brew flow)
  method: optionalEnum(BREW_METHODS),
  doseG: optionalPositiveNumber,
  waterG: optionalPositiveNumber,
  dilutionWaterG: optionalPositiveNumber,
  targetWeightG: optionalPositiveNumber,
  temperatureC: optionalInt,
  targetTimeMs: optionalInt,
  tdsPercent: optionalPositiveNumber,
  wouldBrewAgain: z.boolean().optional(),
  mokaCupSize: optionalInt,
  // Was literally 1 or 2, which is all espresso can be. Any method can
  // record cups now, so the range matches the column's own check.
  cupCount: z.number().int().min(1).max(MAX_CUP_COUNT).optional(),
  heatIntensity: optionalEnum(HEAT_INTENSITIES),
  equipmentId: z.uuid().optional(),
  grinderId: z.uuid().optional(),
  // Display-only snapshot of the equipment names at brew time (survives the
  // equipment row later being renamed or deleted) — not their own columns.
  equipmentModelName: z.string().trim().max(200).optional(),
  grinderModelName: z.string().trim().max(200).optional(),

  // Molienda
  grindSetting: optionalNonNegativeNumber,
  grindSeconds: optionalPositiveNumber,
  doseMode: optionalEnum(DOSE_MODES),
  doseFeedback: optionalEnum(DOSE_FEEDBACKS),

  // Configuración del molinillo (opcional, todos los métodos): molinillos
  // de doble muela (p. ej. Sage) exponen un dial en el molinillo y otro en
  // la máquina. Única definición de "muela" desde 0035.
  grinderUpperBurr: optionalBurrSetting,
  grinderLowerBurr: optionalBurrSetting,

  // Cesta (legado, solo espresso Sage)
  basketSize: optionalEnum(BASKET_SIZES),

  // Temperatura (legado, solo espresso Sage)
  temperatureOffsetC: optionalInt,

  // Extracción
  shotMode: optionalEnum(SHOT_MODES),
  extractionMs: optionalInt,

  // Peso / volumen
  inputWeightG: optionalPositiveNumber,
  outputWeightG: optionalPositiveNumber,

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
  // The public attempt whose recipe this one was brewed from, if any.
  recipeSourceAttemptId: z.uuid().optional(),
  // The brew draft's own draftId, reused as an idempotency key so retrying a
  // save (manual "Reintentar" or auto-retry on reconnect) can never insert
  // the same attempt twice.
  idempotencyKey: z.uuid().optional(),
  attempt: attemptFieldsSchema,
  // Photos taken at the photo step, before the coffee was tasted: already
  // uploaded to Storage under the draft's folder, waiting for an attempt id
  // to belong to. Registered as attempt_media by createAttemptAction.
  media: z
    .array(
      z.object({
        kind: z.enum(ATTEMPT_MEDIA_KINDS).default("espresso"),
        storagePath: z.string().min(1),
      }),
    )
    .optional(),
});

export const updateAttemptSchema = z.object({
  attemptId: z.uuid(),
  attempt: attemptFieldsSchema,
});

export const setPreferredAttemptSchema = z.object({
  coffeeId: z.uuid(),
  attemptId: z.uuid().nullable(),
});

export const setAttemptDashboardVisibilitySchema = z.object({
  attemptId: z.uuid(),
  hidden: z.boolean(),
});

export const registerAttemptMediaSchema = z.object({
  attemptId: z.uuid(),
  kind: z.enum(ATTEMPT_MEDIA_KINDS).default("espresso"),
  storagePath: z.string().min(1),
  altText: z.string().trim().max(300).optional(),
});
