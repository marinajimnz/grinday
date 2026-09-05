"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addBrewEquipmentBatchSchema,
  addGrinderSchema,
  removeBrewEquipmentSchema,
  removeGrinderSchema,
  setDefaultBrewEquipmentSchema,
  setDefaultGrinderSchema,
} from "@/lib/validation/equipment";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function addGrinderAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = addGrinderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data, error } = await supabase
    .from("user_grinders")
    .insert({ user_id: user.id, model_name: parsed.data.modelName })
    .select("id")
    .single();
  if (error) return { success: false, message: error.message };

  revalidatePath("/settings/machines");
  revalidatePath("/");
  return { success: true, data: { id: data.id } };
}

export async function removeGrinderAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = removeGrinderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_grinders").delete().eq("id", parsed.data.grinderId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/settings/machines");
  return { success: true, data: undefined };
}

export async function addBrewEquipmentBatchAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = addBrewEquipmentBatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const rows = parsed.data.entries.flatMap(({ method, modelNames }) =>
    modelNames.map((modelName) => ({ user_id: user.id, method, model_name: modelName })),
  );

  const { error } = await supabase.from("user_brew_equipment").insert(rows);
  if (error) return { success: false, message: error.message };

  revalidatePath("/settings/machines");
  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function removeBrewEquipmentAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = removeBrewEquipmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_brew_equipment")
    .delete()
    .eq("id", parsed.data.equipmentId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/settings/machines");
  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function setDefaultGrinderAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = setDefaultGrinderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_default_grinder", {
    p_grinder_id: parsed.data.grinderId,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/settings/machines");
  return { success: true, data: undefined };
}

export async function setDefaultBrewEquipmentAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = setDefaultBrewEquipmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_default_equipment", {
    p_equipment_id: parsed.data.equipmentId,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/settings/machines");
  return { success: true, data: undefined };
}
