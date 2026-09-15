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

type Client = SupabaseClient<Database>;

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("coffees")
    .select("id, name, roaster")
    .eq("user_id", user.id)
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
  revalidatePath("/inventory");
  return { success: true, data: undefined };
}

// A bag lands in Inventario > Archivadas for either of two independent
// reasons (see listBagsGrouped), so undoing it has to clear both or the row
// wouldn't move: the coffee's archived_at, and the bag's own "archived"
// status if someone set it by hand on the edit form. Those bags get their
// status recomputed from their dates rather than guessed — the same
// finished/open/sealed ladder the bag form derives.
export async function unarchiveCoffeeAction(coffeeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("coffees")
    .update({ archived_at: null })
    .eq("id", coffeeId);
  if (error) return { success: false, message: error.message };

  const { data: archivedBags } = await supabase
    .from("coffee_bags")
    .select("id, opened_at, finished_at")
    .eq("coffee_id", coffeeId)
    .eq("status", "archived");

  for (const bag of archivedBags ?? []) {
    const status = bag.finished_at ? "finished" : bag.opened_at ? "open" : "sealed";
    // Best-effort: the coffee is already out of the archive, and a bag stuck
    // on "archived" is a wrong badge, not lost data.
    const { error: bagError } = await supabase
      .from("coffee_bags")
      .update({ status })
      .eq("id", bag.id);
    if (bagError) console.error("[coffees] failed to unarchive bag:", bagError.message);
  }

  revalidatePath("/coffees");
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath(`/coffees/${coffeeId}`);
  return { success: true, data: undefined };
}

// How much history a delete would take with it, so the confirmation can name
// it instead of saying a vague "esto no se puede deshacer".
export async function getCoffeeDeletionImpactAction(
  coffeeId: string,
): Promise<ActionResult<{ bags: number; attempts: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const [{ count: bags }, { count: attempts }] = await Promise.all([
    supabase.from("coffee_bags").select("id", { count: "exact", head: true }).eq("coffee_id", coffeeId),
    supabase
      .from("brew_attempts")
      .select("id", { count: "exact", head: true })
      .eq("coffee_id", coffeeId)
      .eq("user_id", user.id),
  ]);

  return { success: true, data: { bags: bags ?? 0, attempts: attempts ?? 0 } };
}

// Every row hanging off a coffee goes with it through ON DELETE CASCADE
// (coffee_bags -> coffee_media/inventory_events, brew_attempts ->
// attempt_media). Storage is the one thing no cascade reaches, so the photo
// paths have to be read and removed while the rows that name them still
// exist — afterwards nothing would know those files were ever referenced.
async function removeCoffeePhotos(supabase: Client, coffeeId: string, userId: string) {
  const { data: bags } = await supabase
    .from("coffee_bags")
    .select("id")
    .eq("coffee_id", coffeeId);
  const bagIds = (bags ?? []).map((b) => b.id);

  const { data: attempts } = await supabase
    .from("brew_attempts")
    .select("id")
    .eq("coffee_id", coffeeId)
    .eq("user_id", userId);
  const attemptIds = (attempts ?? []).map((a) => a.id);

  const [coffeeMedia, attemptMedia] = await Promise.all([
    bagIds.length
      ? supabase.from("coffee_media").select("storage_path").in("coffee_bag_id", bagIds)
      : Promise.resolve({ data: [] as { storage_path: string }[] }),
    attemptIds.length
      ? supabase.from("attempt_media").select("storage_path").in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] as { storage_path: string }[] }),
  ]);

  const paths = [...(coffeeMedia.data ?? []), ...(attemptMedia.data ?? [])].map(
    (m) => m.storage_path,
  );
  if (!paths.length) return;

  // Best-effort: a file we couldn't remove is already unreachable from the
  // app, and shouldn't keep the user from deleting the coffee itself.
  const { error } = await supabase.storage.from("coffee-photos").remove(paths);
  if (error) console.error("[coffees] failed to delete coffee photos:", error.message);
}

// Permanent, and it takes the coffee's whole history with it: every bag,
// every attempt logged against it, and their photos. It used to refuse
// whenever any of that existed, which left no way at all to get rid of a
// coffee once it had been brewed — the user had to delete each attempt by
// hand and still couldn't finish the job. Archiving remains the
// non-destructive option; this one is for actually throwing a coffee away,
// so the caller is expected to confirm first (both callers make the user
// retype the coffee's name).
export async function deleteCoffeeAction(coffeeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  await removeCoffeePhotos(supabase, coffeeId, user.id);

  const { error } = await supabase.from("coffees").delete().eq("id", coffeeId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/coffees");
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/attempts");
  return { success: true, data: undefined };
}

// Same rule as deleteCoffeeAction, one level down: coffee_bags ->
// brew_attempts is an ON DELETE CASCADE FK, so this deliberately takes the
// attempts brewed from this bag with it rather than refusing while any
// exist. Callers confirm first.
export async function deleteBagAction(bagId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  await removeBagPhotos(supabase, bagId, user.id);

  const { data: deleted, error } = await supabase
    .from("coffee_bags")
    .delete()
    .eq("id", bagId)
    .select("coffee_id")
    .maybeSingle();
  if (error) return { success: false, message: error.message };

  if (deleted) revalidatePath(`/coffees/${deleted.coffee_id}`);
  revalidatePath("/coffees");
  revalidatePath("/inventory");
  revalidatePath("/attempts");
  revalidatePath("/");
  return { success: true, data: undefined };
}

// See removeCoffeePhotos — same reason, scoped to one bag.
async function removeBagPhotos(supabase: Client, bagId: string, userId: string) {
  const { data: attempts } = await supabase
    .from("brew_attempts")
    .select("id")
    .eq("coffee_bag_id", bagId)
    .eq("user_id", userId);
  const attemptIds = (attempts ?? []).map((a) => a.id);

  const [bagMedia, attemptMedia] = await Promise.all([
    supabase.from("coffee_media").select("storage_path").eq("coffee_bag_id", bagId),
    attemptIds.length
      ? supabase.from("attempt_media").select("storage_path").in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] as { storage_path: string }[] }),
  ]);

  const paths = [...(bagMedia.data ?? []), ...(attemptMedia.data ?? [])].map(
    (m) => m.storage_path,
  );
  if (!paths.length) return;

  const { error } = await supabase.storage.from("coffee-photos").remove(paths);
  if (error) console.error("[coffees] failed to delete bag photos:", error.message);
}

// How much history deleting one bag would take with it.
export async function getBagDeletionImpactAction(
  bagId: string,
): Promise<ActionResult<{ attempts: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { count } = await supabase
    .from("brew_attempts")
    .select("id", { count: "exact", head: true })
    .eq("coffee_bag_id", bagId)
    .eq("user_id", user.id);

  return { success: true, data: { attempts: count ?? 0 } };
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
