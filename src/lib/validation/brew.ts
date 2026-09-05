import { z } from "zod";
import { BREW_METHODS } from "@/features/equipment/constants";

export const startBrewSchema = z.object({
  coffeeId: z.uuid(),
  method: z.enum(BREW_METHODS),
});
