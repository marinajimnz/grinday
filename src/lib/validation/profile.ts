import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Escribe un nombre")
    .max(60, "Máximo 60 caracteres"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
