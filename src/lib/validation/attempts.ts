import { z } from "zod";
import {
  ATTEMPT_MEDIA_KINDS,
  BASKET_SIZES,
  BASKET_WALLS,
  DOSE_FEEDBACKS,
  DOSE_MODES,
  PRESSURE_OBSERVATIONS,
  SHOT_MODES,
} from "@/features/attempts/constants";
import { optionalEnum, optionalInt, optionalPositiveNumber, optionalRating } from "./shared";

export const attemptFieldsSchema = z.object({
  // Molienda
  grindSetting: z.number("El molido es obligatorio").min(0),
  grindSeconds: z.number("Los segundos de molienda son obligatorios").min(0),
  doseMode: z.enum(DOSE_MODES, "Elige auto o manual"),
  doseFeedback: optionalEnum(DOSE_FEEDBACKS),
  usedBitMore: z.boolean().default(false),

  // Cesta
  basketSize: z.enum(BASKET_SIZES, "Elige el tamaño de cesta"),
  basketWall: optionalEnum(BASKET_WALLS),

  // Temperatura / muela
  temperatureOffsetC: optionalInt,
  upperBurrSetting: optionalInt,

  // Extracción
  shotMode: z.enum(SHOT_MODES, "Elige el modo de shot"),
  extractionMs: optionalInt,
  preinfusionMs: optionalInt,
  pressureObservation: optionalEnum(PRESSURE_OBSERVATIONS),

  // Peso / volumen (opcional, futuro báscula)
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
