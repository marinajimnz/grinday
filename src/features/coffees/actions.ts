"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  addBagSchema,
  bagFieldsSchema,
  coffeeFieldsSchema,
  createCoffeeAndBagSchema,
  findSimilarCoffeeSchema,
  registerMediaSchema,
  updateBagSchema,
  updateCoffeeSchema,
} from "@/lib/validation/coffees";
import type { Database } from "@/types/database";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

type CoffeeFields = Database["public"]["Tables"]["coffees"]["Insert"];
type BagFields = Database["public"]["Tables"]["coffee_bags"]["Insert"];

function toCoffeeRow(
  input: z.infer<typeof coffeeFieldsSchema>,
): Omit<CoffeeFields, "id" | "user_id"> {
  return {
    name: input.name,
    roaster: input.roaster,
    country: input.country ?? null,
    region: input.region ?? null,
    farm: input.farm ?? null,
    producer: input.producer ?? null,
    varieties: input.varieties,
    process: input.process ?? null,
    altitude_min_m: input.altitudeMinM ?? null,
    altitude_max_m: input.altitudeMaxM ?? null,
    roast_level: input.roastLevel ?? null,
    tasting_notes: input.tastingNotes,
  };
}

function toBagRow(
  input: z.infer<typeof bagFieldsSchema>,
): Omit<BagFields, "id" | "user_id" | "coffee_id"> {
  return {
    roast_date: input.roastDate ?? null,
    purchase_date: input.purchaseDate ?? null,
    opened_at: input.openedAt ?? null,
    first_brew_at: input.firstBrewAt ?? null,
    finished_at: input.finishedAt ?? null,
    package_weight_g: input.packageWeightG ?? null,
    inventory_mode: input.inventoryMode,
    estimated_dose_g: input.estimatedDoseG ?? null,
    status: input.status,
    lot_label: input.lotLabel ?? null,
  };
}

// Fase 5: seeds the inventory ledger so coffee_bags.remaining_g (kept in
// sync by a DB trigger on inventory_events) starts from the package weight
// instead of null. No-op when the weight wasn't given — inventory just
// stays untracked for that bag until the first manual adjustment.
async function seedInventoryEvent(
  supabase: SupabaseClient<Database>,
  bagId: string,
  userId: string,
  packageWeightG: number | undefined,
) {
  if (!packageWeightG) return;
  const { error } = await supabase.from("inventory_events").insert({
    coffee_bag_id: bagId,
    user_id: userId,
    kind: "initial",
    delta_g: packageWeightG,
  });
  if (error) console.error("[inventory] failed to seed initial event:", error.message);
}

export async function findSimilarCoffeeAction(input: { name: string; roaster: string }) {
  const parsed = findSimilarCoffeeSchema.safeParse(input);
  if (!parsed.success) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("coffees")
    .select("id, name, roaster")
    .ilike("name", parsed.data.name)
    .ilike("roaster", parsed.data.roaster)
    .is("archived_at", null)
    .maybeSingle();

  return data;
}

export async function createCoffeeAndBagAction(
  rawInput: unknown,
): Promise<ActionResult<{ coffeeId: string; bagId: string }>> {
  const parsed = createCoffeeAndBagSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffee, bag, existingCoffeeId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  let coffeeId = existingCoffeeId;

  if (!coffeeId) {
    const { data: inserted, error: coffeeError } = await supabase
      .from("coffees")
      .insert({ ...toCoffeeRow(coffee), user_id: user.id })
      .select("id")
      .single();
    if (coffeeError) return { success: false, message: coffeeError.message };
    coffeeId = inserted.id;
  }

  const { data: insertedBag, error: bagError } = await supabase
    .from("coffee_bags")
    .insert({ ...toBagRow(bag), coffee_id: coffeeId, user_id: user.id })
    .select("id")
    .single();
  if (bagError) return { success: false, message: bagError.message };

  await seedInventoryEvent(supabase, insertedBag.id, user.id, bag.packageWeightG);

  revalidatePath("/coffees");
  revalidatePath("/");
  return { success: true, data: { coffeeId, bagId: insertedBag.id } };
}

export async function addBagAction(
  rawInput: unknown,
): Promise<ActionResult<{ bagId: string }>> {
  const parsed = addBagSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeId, bag } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data: insertedBag, error } = await supabase
    .from("coffee_bags")
    .insert({ ...toBagRow(bag), coffee_id: coffeeId, user_id: user.id })
    .select("id")
    .single();
  if (error) return { success: false, message: error.message };

  await seedInventoryEvent(supabase, insertedBag.id, user.id, bag.packageWeightG);

  revalidatePath(`/coffees/${coffeeId}`);
  revalidatePath("/coffees");
  return { success: true, data: { bagId: insertedBag.id } };
}

export async function updateCoffeeAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = updateCoffeeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeId, coffee } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("coffees")
    .update(toCoffeeRow(coffee))
    .eq("id", coffeeId);
  if (error) return { success: false, message: error.message };

  revalidatePath(`/coffees/${coffeeId}`);
  revalidatePath("/coffees");
  return { success: true, data: undefined };
}

export async function updateBagAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = updateBagSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { bagId, bag } = parsed.data;

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("coffee_bags")
    .update(toBagRow(bag))
    .eq("id", bagId)
    .select("coffee_id")
    .single();
  if (error) return { success: false, message: error.message };

  revalidatePath(`/bags/${bagId}`);
  if (updated) revalidatePath(`/coffees/${updated.coffee_id}`);
  revalidatePath("/coffees");
  return { success: true, data: undefined };
}

export async function archiveCoffeeAction(coffeeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("coffees")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", coffeeId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/coffees");
  revalidatePath("/");
  return { success: true, data: undefined };
}

// Unlike archiving, this is permanent — only allowed when the coffee has no
// bags or attempts yet (a genuine mistake, not real history). Anything with
// data has to be archived instead, never deleted.
export async function deleteCoffeeAction(coffeeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());

  const [{ count: bagCount }, { count: attemptCount }] = await Promise.all([
    supabase.from("coffee_bags").select("id", { count: "exact", head: true }).eq("coffee_id", coffeeId),
    supabase.from("brew_attempts").select("id", { count: "exact", head: true }).eq("coffee_id", coffeeId),
  ]);

  if ((bagCount ?? 0) > 0 || (attemptCount ?? 0) > 0) {
    return { success: false, message: dict.coffees.deleteBlocked };
  }

  const { error } = await supabase.from("coffees").delete().eq("id", coffeeId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/coffees");
  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function registerCoffeeMediaAction(
  rawInput: unknown,
): Promise<ActionResult<{ mediaId: string }>> {
  const parsed = registerMediaSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeBagId, kind, storagePath, altText } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data, error } = await supabase
    .from("coffee_media")
    .insert({
      coffee_bag_id: coffeeBagId,
      user_id: user.id,
      kind,
      storage_path: storagePath,
      alt_text: altText ?? null,
    })
    .select("id")
    .single();
  if (error) return { success: false, message: error.message };

  revalidatePath(`/bags/${coffeeBagId}`);
  // A package_front photo becomes the coffee's cover image on the library
  // grid, which has its own cached listing to drop too.
  revalidatePath("/coffees");
  return { success: true, data: { mediaId: data.id } };
}

export async function deleteCoffeeMediaAction(
  mediaId: string,
  coffeeBagId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: media, error: fetchError } = await supabase
    .from("coffee_media")
    .select("storage_path")
    .eq("id", mediaId)
    .single();
  if (fetchError) return { success: false, message: fetchError.message };

  const { error: storageError } = await supabase.storage
    .from("coffee-photos")
    .remove([media.storage_path]);
  if (storageError) {
    console.error("[storage] failed to delete coffee photo:", storageError.message);
  }

  const { error } = await supabase.from("coffee_media").delete().eq("id", mediaId);
  if (error) return { success: false, message: error.message };

  revalidatePath(`/bags/${coffeeBagId}`);
  return { success: true, data: undefined };
}
