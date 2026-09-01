import { z } from "zod";

export const setDefaultMachineSchema = z.object({
  machineModelId: z.uuid(),
});

export type SetDefaultMachineInput = z.infer<typeof setDefaultMachineSchema>;
