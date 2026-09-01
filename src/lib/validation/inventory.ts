import { z } from "zod";

export const adjustInventorySchema = z.object({
  coffeeBagId: z.uuid(),
  newRemainingG: z.number().min(0, "No puede ser negativo"),
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});
