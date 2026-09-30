"use server";

import { createClient } from "@/lib/supabase/server";
import { startBrewFromAttemptSchema, startBrewSchema } from "@/lib/validation/brew";
import { getLastAttemptForCoffeeAndMethod, RECIPE_SOURCE_ATTEMPT_FIELDS } from "@/features/attempts/queries";
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
// the recipe to seed from — the preferred attempt when it was brewed with
// this method, else the last one logged for the pair — and the
// silently-picked default equipment/grinder for the chosen method.
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
    .select("id, name, roaster, preferred_attempt_id")
    .eq("id", coffeeId)
    .eq("user_id", user.id)
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

  // The picker labels a coffee "Receta favorita · intento #N" and the page
  // above it promises "si tiene receta favorita, partimos de ahí" — but the
  // seeding ignored the pointer entirely and always took the newest attempt
  // for this (coffee, method), so marking a recipe preferred changed nothing
  // in the flow that advertises it. It's honoured now, with the caveat the
  // original comment was right about: a preferred V60 says nothing about the
  // espresso you're pulling, so a method mismatch falls back to the newest.
  const [preferredAttempt, lastForMethod, defaultEquipment, defaultGrinder] = await Promise.all([
    coffee.preferred_attempt_id
      ? supabase
          .from("brew_attempts")
          .select(RECIPE_SOURCE_ATTEMPT_FIELDS)
          .eq("id", coffee.preferred_attempt_id)
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => data)
      : Promise.resolve(null),
    getLastAttemptForCoffeeAndMethod(supabase, coffeeId, method, user.id),
    getDefaultEquipmentForMethod(supabase, method, user.id),
    getDefaultGrinder(supabase, user.id),
  ]);

  const sourceAttempt =
    preferredAttempt?.method === method ? preferredAttempt : lastForMethod;

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

// "Preparar" from one specific past attempt (dashboard long-press menu):
// seeds the recipe from that exact attempt rather than the coffee's latest
// for its method, and — like PrepareWithRecipeButton — carries its own
// equipment/grinder along instead of substituting today's default.
export async function startBrewFromAttemptAction(
  rawInput: unknown,
): Promise<ActionResult<StartBrewData>> {
  const parsed = startBrewFromAttemptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { attemptId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data: attempt, error: attemptError } = await supabase
    .from("brew_attempts")
    .select(
      `${RECIPE_SOURCE_ATTEMPT_FIELDS}, coffee_id, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster)`,
    )
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (attemptError) return { success: false, message: attemptError.message };
  if (!attempt || !attempt.coffee) return { success: false, message: "Intento no encontrado" };

  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("id, status, created_at")
    .eq("coffee_id", attempt.coffee_id)
    .order("created_at", { ascending: false });
  if (bagsError) return { success: false, message: bagsError.message };

  const bag =
    bags?.find((b) => b.status === "open") ??
    bags?.find((b) => b.status === "sealed") ??
    bags?.[0];
  if (!bag) return { success: false, message: "Este café no tiene ninguna bolsa disponible" };

  return {
    success: true,
    data: {
      userId: user.id,
      coffeeId: attempt.coffee.id,
      coffeeBagId: bag.id,
      coffeeName: attempt.coffee.name,
      roaster: attempt.coffee.roaster,
      sourceAttempt: attempt,
      defaultEquipment: null,
      defaultGrinder: null,
    },
  };
}
