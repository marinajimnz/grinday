import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{3,20}$/),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
