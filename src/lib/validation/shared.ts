import { z } from "zod";

export const optionalPositiveNumber = z
  .union([z.number().positive(), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

export const optionalNonNegativeNumber = z
  .union([z.number().min(0), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

export const optionalInt = z
  .union([z.number().int(), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

export const optionalRating = z
  .union([z.number().int().min(1).max(5), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

// Grinder burr dial position (e.g. Sage-style upper/lower burr rings) — a
// whole number from 1 to 24.
export const optionalBurrSetting = z
  .union([z.number().int().min(1).max(24), z.nan(), z.undefined()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

export function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .enum(values)
    .optional()
    .or(z.literal("").transform(() => undefined));
}
