import { z } from "zod";

export const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;
export const BIO_MAX_LENGTH = 160;

// What someone types in a handle field: "@Marina" and " marina " both mean
// the handle "marina". Anything still outside [a-z0-9_] after that is theirs
// to fix, not ours to guess at.
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

const handleSchema = z
  .string()
  .transform(normalizeHandle)
  .refine((value) => HANDLE_PATTERN.test(value), { message: "handle_invalid" });

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Escribe un nombre")
    .max(60, "Máximo 60 caracteres"),
  // Both optional so the form keeps working for accounts that don't see
  // them yet (the public side is off for them). An empty field clears it.
  handle: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : normalizeHandle(value) || null))
    .refine((value) => value == null || HANDLE_PATTERN.test(value), { message: "handle_invalid" }),
  bio: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value.trim() || null))
    .refine((value) => value == null || value.length <= BIO_MAX_LENGTH, { message: "bio_too_long" }),
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const setVisibilitySchema = z.discriminatedUnion("visibility", [
  z.object({ visibility: z.literal("private") }),
  z.object({ visibility: z.literal("public"), handle: handleSchema.optional() }),
]);

export type SetVisibilityInput = z.input<typeof setVisibilitySchema>;
