"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adjustInventorySchema } from "@/lib/validation/inventory";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function adjustInventoryAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = adjustInventorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeBagId, newRemainingG, note } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data: bag, error: bagError } = await supabase
    .from("coffee_bags")
    .select("id, remaining_g")
    .eq("id", coffeeBagId)
    .maybeSingle();
  if (bagError) return { success: false, message: bagError.message };
  if (!bag) return { success: false, message: "Bolsa no encontrada" };

  const currentRemaining = bag.remaining_g ?? 0;
  const delta = newRemainingG - currentRemaining;

  if (delta !== 0) {
    const { error } = await supabase.from("inventory_events").insert({
      coffee_bag_id: coffeeBagId,
      user_id: user.id,
      kind: "manual_adjustment",
      delta_g: delta,
      note: note ?? null,
    });
    if (error) return { success: false, message: error.message };
  }

  revalidatePath(`/bags/${coffeeBagId}`);
  revalidatePath("/inventory");
  return { success: true, data: undefined };
}
