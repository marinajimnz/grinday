import { z } from "zod";

export const BIO_MAX_LENGTH = 160;

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Escribe un nombre")
    .max(60, "Máximo 60 caracteres"),
  // Optional so the form keeps working for accounts that don't see it yet
  // (the public side is off for them). An empty field clears it.
  bio: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value.trim() || null))
    .refine((value) => value == null || value.length <= BIO_MAX_LENGTH, { message: "bio_too_long" }),
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const setVisibilitySchema = z.object({
  visibility: z.enum(["private", "public"]),
});

export type SetVisibilityInput = z.input<typeof setVisibilitySchema>;
