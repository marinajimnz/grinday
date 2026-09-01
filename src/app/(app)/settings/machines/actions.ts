"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setDefaultMachineSchema } from "@/lib/validation/machines";

export async function setDefaultMachineAction(machineModelId: string) {
  const input = setDefaultMachineSchema.parse({ machineModelId });
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_default_machine", {
    p_machine_model_id: input.machineModelId,
  });

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidatePath("/settings/machines");
  revalidatePath("/");
  return { success: true as const };
}
