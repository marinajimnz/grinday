"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findSimilarCoffee } from "@/features/coffees/queries";
import { getDefaultEquipmentForMethod, getDefaultGrinder } from "@/features/equipment/queries";
import { RECIPE_SOURCE_ATTEMPT_FIELDS } from "@/features/attempts/queries";
import type { RecipeSourceAttempt } from "@/features/brew/draft";
import type { StartBrewData } from "@/features/brew/actions";
import type { BrewMethod } from "@/features/equipment/constants";

type ActionResult = { success: true } | { success: false; message: string };

type CloneRecipeResult =
  | { success: true; data: StartBrewData & { clonedFromAttemptId: string } }
  | { success: false; message: string };

// "Probar esta receta" from another user's public profile: finds/creates
// the equivalent coffee (+ a bag, if it has none yet) in the CURRENT
// user's own library, then hands back everything buildDraftFromRecipe
// needs — same shape as startBrewAction/startBrewFromAttemptAction, so the
// button can reuse that exact helper. Doesn't touch brew_attempts itself;
// the clone only becomes a real row (with cloned_from_attempt_id set) when
// the user actually saves the brew, same as any other draft.
export async function cloneRecipeAction(sourceAttemptId: string): Promise<CloneRecipeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  // RLS (brew_attempts_select_public) only returns this row if its owner's
  // profile is public — a nonexistent attempt or a since-gone-private
  // profile both resolve to null here, which is exactly "can't clone".
  const { data: sourceAttempt, error: attemptError } = await supabase
    .from("brew_attempts")
    .select(`${RECIPE_SOURCE_ATTEMPT_FIELDS}, coffee:coffees!brew_attempts_coffee_id_fkey(name, roaster)`)
    .eq("id", sourceAttemptId)
    .maybeSingle();
  if (attemptError) return { success: false, message: attemptError.message };
  if (!sourceAttempt || !sourceAttempt.coffee) {
    return { success: false, message: "Receta no encontrada o no pública" };
  }
  const { name, roaster } = sourceAttempt.coffee;

  let coffeeId = (await findSimilarCoffee(supabase, name, roaster, user.id))?.id;
  if (!coffeeId) {
    const { data: newCoffee, error: coffeeError } = await supabase
      .from("coffees")
      .insert({ user_id: user.id, name, roaster })
      .select("id")
      .single();
    if (coffeeError) return { success: false, message: coffeeError.message };
    coffeeId = newCoffee.id;
  }

  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("id, status, created_at")
    .eq("coffee_id", coffeeId)
    .order("created_at", { ascending: false });
  if (bagsError) return { success: false, message: bagsError.message };

  let bagId =
    bags?.find((b) => b.status === "open")?.id ?? bags?.find((b) => b.status === "sealed")?.id ?? bags?.[0]?.id;
  if (!bagId) {
    const { data: newBag, error: bagError } = await supabase
      .from("coffee_bags")
      .insert({ coffee_id: coffeeId, user_id: user.id })
      .select("id")
      .single();
    if (bagError) return { success: false, message: bagError.message };
    bagId = newBag.id;
  }

  const method = sourceAttempt.method as BrewMethod;
  const [defaultEquipment, defaultGrinder] = await Promise.all([
    getDefaultEquipmentForMethod(supabase, method, user.id),
    getDefaultGrinder(supabase, user.id),
  ]);

  // The recipe numbers carry over; equipment_id/grinder_id do not — those
  // point at the source's own gear, not ours. defaultEquipment/
  // defaultGrinder above (the *cloning* user's own defaults) are what
  // buildDraftFromRecipe should fall back to instead.
  const recipeForDraft: RecipeSourceAttempt = {
    id: sourceAttempt.id,
    attempt_no: sourceAttempt.attempt_no,
    method: sourceAttempt.method,
    dose_g: sourceAttempt.dose_g,
    water_g: sourceAttempt.water_g,
    dilution_water_g: sourceAttempt.dilution_water_g,
    target_weight_g: sourceAttempt.target_weight_g,
    temperature_c: sourceAttempt.temperature_c,
    target_time_ms: sourceAttempt.target_time_ms,
    grind_setting: sourceAttempt.grind_setting,
    grinder_upper_burr: sourceAttempt.grinder_upper_burr,
    grinder_lower_burr: sourceAttempt.grinder_lower_burr,
    moka_cup_size: sourceAttempt.moka_cup_size,
    heat_intensity: sourceAttempt.heat_intensity,
    equipment_id: null,
    grinder_id: null,
    equipment_snapshot: sourceAttempt.equipment_snapshot,
  };

  return {
    success: true,
    data: {
      userId: user.id,
      coffeeId,
      coffeeBagId: bagId,
      coffeeName: name,
      roaster,
      // RecipeSourceAttempt keeps equipment_snapshot as `unknown` (draft.ts
      // has no reason to import the DB Json type); StartBrewData's shape
      // comes straight from the DB query and wants Json specifically.
      sourceAttempt: recipeForDraft as StartBrewData["sourceAttempt"],
      defaultEquipment: defaultEquipment
        ? { id: defaultEquipment.id, model_name: defaultEquipment.model_name }
        : null,
      defaultGrinder: defaultGrinder ? { id: defaultGrinder.id, model_name: defaultGrinder.model_name } : null,
      clonedFromAttemptId: sourceAttempt.id,
    },
  };
}

export async function followUserAction(
  followeeId: string,
  followeeUsername: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };
  if (user.id === followeeId) {
    return { success: false, message: "No puedes seguirte a ti misma" };
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  // 23505 = unique_violation — already following, treat as a no-op success
  // rather than an error (the button state was already right).
  if (error && error.code !== "23505") {
    return { success: false, message: error.message };
  }

  revalidatePath(`/u/${followeeUsername}`);
  revalidatePath(`/u/${followeeUsername}/seguidores`);
  return { success: true };
}

export async function unfollowUserAction(
  followeeId: string,
  followeeUsername: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId);
  if (error) return { success: false, message: error.message };

  revalidatePath(`/u/${followeeUsername}`);
  revalidatePath(`/u/${followeeUsername}/seguidores`);
  return { success: true };
}
