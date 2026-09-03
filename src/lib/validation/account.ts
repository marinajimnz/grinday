import { z } from "zod";

export const changeUsernameSchema = z.object({
  newUsername: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{3,20}$/),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});
