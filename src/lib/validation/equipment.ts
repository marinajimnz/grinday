import { z } from "zod";
import { BREW_METHODS } from "@/features/equipment/constants";

export const addGrinderSchema = z.object({
  modelName: z.string().trim().min(1).max(200),
});

export const removeGrinderSchema = z.object({
  grinderId: z.uuid(),
});

export const setDefaultGrinderSchema = z.object({
  grinderId: z.uuid(),
});

export const addBrewEquipmentBatchSchema = z.object({
  entries: z
    .array(
      z.object({
        method: z.enum(BREW_METHODS),
        modelNames: z.array(z.string().trim().min(1).max(200)).min(1),
      }),
    )
    .min(1),
});

export const removeBrewEquipmentSchema = z.object({
  equipmentId: z.uuid(),
});

export const setDefaultBrewEquipmentSchema = z.object({
  equipmentId: z.uuid(),
});
