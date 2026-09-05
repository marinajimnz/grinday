"use server";

import { createClient } from "@/lib/supabase/server";
import { startBrewSchema } from "@/lib/validation/brew";
import { getLastAttemptForCoffeeAndMethod } from "@/features/attempts/queries";
import { getDefaultEquipmentForMethod, getDefaultGrinder } from "@/features/equipment/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

export type StartBrewData = {
  userId: string;
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  sourceAttempt: Awaited<ReturnType<typeof getLastAttemptForCoffeeAndMethod>>;
  defaultEquipment: { id: string; model_name: string } | null;
  defaultGrinder: { id: string; model_name: string } | null;
};

// Bundles everything the client needs to build a brew draft for a
// (coffee, method) pair into one round trip: which bag to consume from,
// the last recipe logged for that exact pair, and the silently-picked
// default equipment/grinder for the chosen method.
export async function startBrewAction(rawInput: unknown): Promise<ActionResult<StartBrewData>> {
  const parsed = startBrewSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeId, method } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data: coffee, error: coffeeError } = await supabase
    .from("coffees")
    .select("id, name, roaster")
    .eq("id", coffeeId)
    .maybeSingle();
  if (coffeeError) return { success: false, message: coffeeError.message };
  if (!coffee) return { success: false, message: "Café no encontrado" };

  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("id, status, created_at")
    .eq("coffee_id", coffeeId)
    .order("created_at", { ascending: false });
  if (bagsError) return { success: false, message: bagsError.message };

  const bag =
    bags?.find((b) => b.status === "open") ??
    bags?.find((b) => b.status === "sealed") ??
    bags?.[0];
  if (!bag) return { success: false, message: "Este café no tiene ninguna bolsa disponible" };

  const [sourceAttempt, defaultEquipment, defaultGrinder] = await Promise.all([
    getLastAttemptForCoffeeAndMethod(supabase, coffeeId, method),
    getDefaultEquipmentForMethod(supabase, method),
    getDefaultGrinder(supabase),
  ]);

  return {
    success: true,
    data: {
      userId: user.id,
      coffeeId: coffee.id,
      coffeeBagId: bag.id,
      coffeeName: coffee.name,
      roaster: coffee.roaster,
      sourceAttempt,
      defaultEquipment: defaultEquipment
        ? { id: defaultEquipment.id, model_name: defaultEquipment.model_name }
        : null,
      defaultGrinder: defaultGrinder
        ? { id: defaultGrinder.id, model_name: defaultGrinder.model_name }
        : null,
    },
  };
}
