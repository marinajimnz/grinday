"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPublicAttempt, getPublicCoffee } from "@/features/profile/publicQueries";
import { getDefaultEquipmentForMethod, getDefaultGrinder } from "@/features/equipment/queries";
import { BREW_METHODS, type BrewMethod } from "@/features/equipment/constants";
import type { RecipeSourceAttempt } from "@/features/brew/draft";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export type TryRecipeData = {
  userId: string;
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  method: BrewMethod;
  // The author's numbers, stripped of anything that points at their
  // account: no equipment or grinder ids, no snapshot of their gear.
  sourceAttempt: RecipeSourceAttempt;
  defaultEquipment: { id: string; model_name: string } | null;
  defaultGrinder: { id: string; model_name: string } | null;
  recipeSource: {
    attemptId: string;
    username: string;
    grind: string | null;
    grinderModelName: string | null;
  };
};

type Result = { success: true; data: TryRecipeData } | { success: false; message: string };

const inputSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,20}$/),
  attemptId: z.uuid(),
});

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function grindLabel(r: { grind_setting: number | null; grinder_upper_burr: number | null; grinder_lower_burr: number | null }) {
  if (r.grind_setting != null) return String(r.grind_setting);
  if (r.grinder_upper_burr != null && r.grinder_lower_burr != null) return `${r.grinder_upper_burr}·${r.grinder_lower_burr}`;
  const single = r.grinder_upper_burr ?? r.grinder_lower_burr;
  return single != null ? String(single) : null;
}

/**
 * "Try this recipe": puts the coffee in your own library — the one you
 * already have with the same name and roaster, or a new copy of its public
 * facts — makes sure it has a bag to brew from, and hands back what the
 * client needs to open a brew seeded with the author's recipe. Everything
 * about the source comes through the same public functions the page used,
 * so a recipe that stopped being public can't be copied.
 */
export async function tryPublicRecipeAction(input: unknown): Promise<Result> {
  const t = getDictionary(await getLocale()).publicProfile;
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: t.tryRecipeUnavailable };
  const { username, attemptId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const source = await getPublicAttempt(supabase, username, attemptId);
  if (!source) return { success: false, message: t.tryRecipeUnavailable };
  const publicCoffee = await getPublicCoffee(supabase, username, source.coffeeId);
  if (!publicCoffee) return { success: false, message: t.tryRecipeUnavailable };
  const facts = publicCoffee.coffee;

  const { data: myCoffees, error: listError } = await supabase
    .from("coffees")
    .select("id, name, roaster")
    .eq("user_id", user.id)
    .is("archived_at", null);
  if (listError) return { success: false, message: t.genericError };

  let coffee = myCoffees?.find(
    (c) => normalize(c.name) === normalize(facts.name) && normalize(c.roaster) === normalize(facts.roaster),
  );
  if (!coffee) {
    const { data: inserted, error } = await supabase
      .from("coffees")
      .insert({
        user_id: user.id,
        name: facts.name,
        roaster: facts.roaster,
        country: facts.country,
        region: facts.region,
        farm: facts.farm,
        producer: facts.producer,
        varieties: facts.varieties,
        process: facts.process,
        altitude_min_m: facts.altitude_min_m,
        altitude_max_m: facts.altitude_max_m,
        roast_level: facts.roast_level,
        tasting_notes: facts.tasting_notes,
      })
      .select("id, name, roaster")
      .single();
    if (error) return { success: false, message: t.genericError };
    coffee = inserted;
  }

  // Brewing needs a bag. The same pick as starting any brew; a coffee with
  // no bag at all gets a plain one (sealed, no inventory tracking), which
  // brewing from it then opens like any other.
  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("id, status")
    .eq("coffee_id", coffee.id)
    .order("created_at", { ascending: false });
  if (bagsError) return { success: false, message: t.genericError };
  let bagId = (bags?.find((b) => b.status === "open") ?? bags?.find((b) => b.status === "sealed") ?? bags?.[0])?.id;
  if (!bagId) {
    const { data: bag, error } = await supabase
      .from("coffee_bags")
      .insert({ coffee_id: coffee.id, user_id: user.id })
      .select("id")
      .single();
    if (error) return { success: false, message: t.genericError };
    bagId = bag.id;
  }

  const recipe = source.recipe;
  const method = (BREW_METHODS as readonly string[]).includes(recipe.method) ? (recipe.method as BrewMethod) : "otros";
  const [defaultEquipment, defaultGrinder] = await Promise.all([
    getDefaultEquipmentForMethod(supabase, method, user.id),
    getDefaultGrinder(supabase, user.id),
  ]);

  revalidatePath("/coffees");
  return {
    success: true,
    data: {
      userId: user.id,
      coffeeId: coffee.id,
      coffeeBagId: bagId,
      coffeeName: coffee.name,
      roaster: coffee.roaster,
      method,
      sourceAttempt: {
        id: attemptId,
        attempt_no: 0,
        method,
        dose_g: recipe.dose_g,
        water_g: recipe.water_g,
        dilution_water_g: recipe.dilution_water_g,
        // What actually came out and how long it actually ran — that's the
        // recipe being tried, more than what the author aimed for.
        target_weight_g: recipe.output_weight_g ?? recipe.target_weight_g,
        temperature_c: recipe.temperature_c,
        target_time_ms: recipe.extraction_ms,
        grind_setting: recipe.grind_setting,
        grinder_upper_burr: recipe.grinder_upper_burr,
        grinder_lower_burr: recipe.grinder_lower_burr,
        moka_cup_size: recipe.moka_cup_size,
        cup_count: recipe.cup_count,
        heat_intensity: recipe.heat_intensity,
        basket_type: recipe.basket_type,
        equipment_id: null,
        grinder_id: null,
        equipment_snapshot: {},
      },
      defaultEquipment: defaultEquipment ? { id: defaultEquipment.id, model_name: defaultEquipment.model_name } : null,
      defaultGrinder: defaultGrinder ? { id: defaultGrinder.id, model_name: defaultGrinder.model_name } : null,
      recipeSource: {
        attemptId,
        username,
        grind: grindLabel(recipe),
        grinderModelName: source.grinderModelName,
      },
    },
  };
}
