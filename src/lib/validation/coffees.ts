import { z } from "zod";
import {
  BAG_STATUSES,
  INVENTORY_MODES,
  MEDIA_KINDS,
  ROAST_LEVELS,
} from "@/features/coffees/constants";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalPositiveNumber = z
  .union([z.number().positive(), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

const optionalNonNegativeNumber = z
  .union([z.number().min(0), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

const optionalInt = z
  .union([z.number().int(), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

export const coffeeFieldsSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
    roaster: z.string().trim().min(1, "El tostador es obligatorio").max(200),
    country: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
    region: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
    farm: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
    producer: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
    varieties: z.array(z.string().trim().min(1)).default([]),
    process: z.string().trim().max(50).optional().or(z.literal("").transform(() => undefined)),
    altitudeMinM: optionalInt,
    altitudeMaxM: optionalInt,
    roastLevel: z
      .enum(ROAST_LEVELS)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    tastingNotes: z.array(z.string().trim().min(1)).default([]),
  })
  .refine(
    (v) =>
      v.altitudeMinM === undefined ||
      v.altitudeMaxM === undefined ||
      v.altitudeMinM <= v.altitudeMaxM,
    { message: "La altitud mínima no puede ser mayor que la máxima", path: ["altitudeMaxM"] },
  );

export const bagFieldsSchema = z.object({
  roastDate: isoDate,
  purchaseDate: isoDate,
  openedAt: isoDate,
  firstBrewAt: isoDate,
  finishedAt: isoDate,
  packageWeightG: optionalPositiveNumber,
  remainingG: optionalNonNegativeNumber,
  inventoryMode: z.enum(INVENTORY_MODES).default("none"),
  estimatedDoseG: optionalPositiveNumber,
  status: z.enum(BAG_STATUSES).default("sealed"),
  lotLabel: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
});

export const createCoffeeAndBagSchema = z.object({
  coffee: coffeeFieldsSchema,
  bag: bagFieldsSchema,
  existingCoffeeId: z.uuid().optional(),
});

export const addBagSchema = z.object({
  coffeeId: z.uuid(),
  bag: bagFieldsSchema,
});

export const updateCoffeeSchema = z.object({
  coffeeId: z.uuid(),
  coffee: coffeeFieldsSchema,
});

export const updateBagSchema = z.object({
  bagId: z.uuid(),
  bag: bagFieldsSchema,
});

export const registerMediaSchema = z.object({
  coffeeBagId: z.uuid(),
  kind: z.enum(MEDIA_KINDS).default("package_front"),
  storagePath: z.string().min(1),
  altText: z.string().trim().max(300).optional(),
});

export const findSimilarCoffeeSchema = z.object({
  name: z.string().trim().min(1),
  roaster: z.string().trim().min(1),
});
