"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  attemptFieldsSchema,
  createAttemptSchema,
  registerAttemptMediaSchema,
  setAttemptDashboardVisibilitySchema,
  setPreferredAttemptSchema,
  updateAttemptSchema,
} from "@/lib/validation/attempts";
import type { Database, Json } from "@/types/database";
import { todayISO } from "@/lib/time";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

type AttemptFields = Database["public"]["Tables"]["brew_attempts"]["Insert"];

function toAttemptRow(
  input: z.infer<typeof attemptFieldsSchema>,
): Omit<
  AttemptFields,
  "id" | "user_id" | "coffee_id" | "coffee_bag_id" | "equipment_snapshot"
> {
  return {
    method: input.method ?? "espresso",
    dose_g: input.doseG ?? null,
    water_g: input.waterG ?? null,
    dilution_water_g: input.dilutionWaterG ?? null,
    target_weight_g: input.targetWeightG ?? null,
    temperature_c: input.temperatureC ?? null,
    target_time_ms: input.targetTimeMs ?? null,
    tds_percent: input.tdsPercent ?? null,
    would_brew_again: input.wouldBrewAgain ?? null,
    moka_cup_size: input.mokaCupSize ?? null,
    cup_count: input.cupCount ?? null,
    heat_intensity: input.heatIntensity ?? null,
    equipment_id: input.equipmentId ?? null,
    grinder_id: input.grinderId ?? null,
    grind_setting: input.grindSetting ?? null,
    grind_seconds: input.grindSeconds ?? null,
    grinder_upper_burr: input.grinderUpperBurr ?? null,
    grinder_lower_burr: input.grinderLowerBurr ?? null,
    dose_mode: input.doseMode ?? null,
    dose_feedback: input.doseFeedback ?? null,
    basket_size: input.basketSize ?? null,
    temperature_offset_c: input.temperatureOffsetC ?? null,
    shot_mode: input.shotMode ?? null,
    extraction_ms: input.extractionMs ?? null,
    input_weight_g: input.inputWeightG ?? null,
    output_weight_g: input.outputWeightG ?? null,
    acidity: input.acidity ?? null,
    sweetness: input.sweetness ?? null,
    bitterness: input.bitterness ?? null,
    body: input.body ?? null,
    intensity: input.intensity ?? null,
    balance: input.balance ?? null,
    overall_rating: input.overallRating ?? null,
    notes: input.notes ?? null,
  };
}

// Attaches the brew-time photos (already uploaded to Storage during the
// photo step) to the attempt they were taken for. Skips any storage path
// that's already registered, so a retried save — which lands on the
// idempotent-replay path below and finds the attempt already there —
// neither loses the photos nor duplicates them.
async function attachBrewPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  attemptId: string,
  media: NonNullable<z.infer<typeof createAttemptSchema>["media"]>,
) {
  if (!media.length) return;

  const { data: existing, error: readError } = await supabase
    .from("attempt_media")
    .select("storage_path")
    .eq("attempt_id", attemptId);
  if (readError) {
    console.error("[attempt-media] failed to read existing photos:", readError.message);
    return;
  }

  const alreadyRegistered = new Set((existing ?? []).map((m) => m.storage_path));
  const rows = media
    .filter((m) => !alreadyRegistered.has(m.storagePath))
    .map((m) => ({
      attempt_id: attemptId,
      user_id: userId,
      kind: m.kind,
      storage_path: m.storagePath,
    }));
  if (!rows.length) return;

  // A photo that fails to register isn't worth failing the save over — the
  // shot itself is the thing the user can't recreate, and the file is still
  // in Storage. Same reasoning as the inventory event below.
  const { error } = await supabase.from("attempt_media").insert(rows);
  if (error) {
    console.error("[attempt-media] failed to attach brew photos:", error.message);
  }
}

export async function createAttemptAction(
  rawInput: unknown,
): Promise<ActionResult<{ attemptId: string }>> {
  const parsed = createAttemptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeBagId, parentAttemptId, recipeSourceAttemptId, idempotencyKey, attempt, media } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  // Idempotent replay: a retried save (manual "Reintentar", or auto-retry on
  // reconnect) for the same draft must land exactly once. If this key was
  // already used, the attempt already exists — return it instead of
  // inserting again (and, critically, without re-running inventory
  // consumption below).
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("brew_attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing) {
      await attachBrewPhotos(supabase, user.id, existing.id, media ?? []);
      return { success: true, data: { attemptId: existing.id } };
    }
  }

  const { data: bag, error: bagError } = await supabase
    .from("coffee_bags")
    .select("id, coffee_id, inventory_mode, estimated_dose_g, status, opened_at, first_brew_at")
    .eq("id", coffeeBagId)
    .maybeSingle();
  if (bagError) return { success: false, message: bagError.message };
  if (!bag) return { success: false, message: "Bolsa no encontrada" };

  const equipmentSnapshot: Json = {
    method: attempt.method ?? "espresso",
    equipment_model_name: attempt.equipmentModelName ?? null,
    grinder_model_name: attempt.grinderModelName ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("brew_attempts")
    .insert({
      ...toAttemptRow(attempt),
      user_id: user.id,
      coffee_id: bag.coffee_id,
      coffee_bag_id: bag.id,
      parent_attempt_id: parentAttemptId ?? null,
      recipe_source_attempt_id: recipeSourceAttemptId ?? null,
      idempotency_key: idempotencyKey ?? null,
      equipment_snapshot: equipmentSnapshot,
    })
    .select("id")
    .single();
  if (error) {
    // Lost the race to a concurrent retry of the same draft — the other
    // request's insert already landed, so this is a success, not a failure.
    if (error.code === "23505" && idempotencyKey) {
      const { data: existing } = await supabase
        .from("brew_attempts")
        .select("id")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        await attachBrewPhotos(supabase, user.id, existing.id, media ?? []);
        return { success: true, data: { attemptId: existing.id } };
      }
    }
    return { success: false, message: error.message };
  }

  await attachBrewPhotos(supabase, user.id, inserted.id, media ?? []);

  // Fase 5: consumo estimado al guardar el intento, cuando aplica —
  // aproximado por shots siempre resta una dosis estimada; en modo gramos
  // solo si el usuario pesó la dosis real de este intento.
  const consumedG =
    bag.inventory_mode === "approximate_shots"
      ? bag.estimated_dose_g
      : bag.inventory_mode === "manual_grams"
        ? attempt.inputWeightG
        : null;
  if (consumedG) {
    const { error: inventoryError } = await supabase.from("inventory_events").insert({
      coffee_bag_id: bag.id,
      user_id: user.id,
      attempt_id: inserted.id,
      kind: "brew_consumption",
      delta_g: -consumedG,
    });
    if (inventoryError) {
      console.error("[inventory] failed to log brew consumption:", inventoryError.message);
    }
  }

  // Brewing from a bag opens it. You cannot take coffee out of a sealed
  // bag, so a bag still marked "Sin abrir" after a brew is the app
  // disagreeing with something that already happened — and the opening
  // date was being left to whoever remembered to type it in, which is
  // nobody. Same for the first brew: this is that brew.
  //
  // Only ever forward: a bag already open keeps the date it was opened on,
  // and a finished bag is not resurrected by a late-logged attempt.
  const bagUpdate: { status?: "open"; opened_at?: string; first_brew_at?: string } = {};
  const today = todayISO();
  if (bag.status === "sealed") bagUpdate.status = "open";
  if (!bag.opened_at) bagUpdate.opened_at = today;
  if (!bag.first_brew_at) bagUpdate.first_brew_at = today;
  if (Object.keys(bagUpdate).length) {
    // Best-effort, like the inventory event above: the attempt is saved,
    // and a stale badge is a wrong label rather than lost data.
    const { error: bagUpdateError } = await supabase
      .from("coffee_bags")
      .update(bagUpdate)
      .eq("id", bag.id);
    if (bagUpdateError) {
      console.error("[coffees] failed to open bag on brew:", bagUpdateError.message);
    }
  }

  revalidatePath(`/coffees/${bag.coffee_id}`);
  revalidatePath(`/bags/${bag.id}`);
  revalidatePath("/coffees");
  revalidatePath("/inventory");
  return { success: true, data: { attemptId: inserted.id } };
}

export async function updateAttemptAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = updateAttemptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { attemptId, attempt } = parsed.data;

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("brew_attempts")
    .update(toAttemptRow(attempt))
    .eq("id", attemptId)
    .select("coffee_id")
    .single();
  if (error) return { success: false, message: error.message };

  revalidatePath(`/attempts/${attemptId}`);
  if (updated) revalidatePath(`/coffees/${updated.coffee_id}`);
  return { success: true, data: undefined };
}

export async function setPreferredAttemptAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = setPreferredAttemptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeId, attemptId } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_preferred_attempt", {
    p_coffee_id: coffeeId,
    // The generated type doesn't know this Postgres param accepts NULL
    // (uuid params carry no nullability info to the type generator).
    p_attempt_id: attemptId as unknown as string,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath(`/coffees/${coffeeId}`);
  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function setAttemptDashboardVisibilityAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = setAttemptDashboardVisibilitySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { attemptId, hidden } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("brew_attempts")
    .update({ hidden_from_dashboard: hidden })
    .eq("id", attemptId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/");
  return { success: true, data: undefined };
}

// Cascades to attempt_media and inventory_events (both "on delete cascade"),
// and clears coffees.preferred_attempt_id if this was the starred one (that
// FK is "on delete set null") — nothing is left orphaned.
export async function deleteAttemptAction(attemptId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("brew_attempts")
    .delete()
    .eq("id", attemptId)
    .select("coffee_id")
    .maybeSingle();
  if (error) return { success: false, message: error.message };

  if (deleted) revalidatePath(`/coffees/${deleted.coffee_id}`);
  revalidatePath("/");
  revalidatePath("/attempts");
  return { success: true, data: undefined };
}

export async function registerAttemptMediaAction(
  rawInput: unknown,
): Promise<ActionResult<{ mediaId: string }>> {
  const parsed = registerAttemptMediaSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { attemptId, kind, storagePath, altText } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data, error } = await supabase
    .from("attempt_media")
    .insert({
      attempt_id: attemptId,
      user_id: user.id,
      kind,
      storage_path: storagePath,
      alt_text: altText ?? null,
    })
    .select("id")
    .single();
  if (error) return { success: false, message: error.message };

  revalidatePath(`/attempts/${attemptId}`);
  return { success: true, data: { mediaId: data.id } };
}

export async function deleteAttemptMediaAction(
  mediaId: string,
  attemptId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: media, error: fetchError } = await supabase
    .from("attempt_media")
    .select("storage_path")
    .eq("id", mediaId)
    .single();
  if (fetchError) return { success: false, message: fetchError.message };

  const { error: storageError } = await supabase.storage
    .from("coffee-photos")
    .remove([media.storage_path]);
  if (storageError) {
    console.error("[storage] failed to delete attempt photo:", storageError.message);
  }

  const { error } = await supabase.from("attempt_media").delete().eq("id", mediaId);
  if (error) return { success: false, message: error.message };

  revalidatePath(`/attempts/${attemptId}`);
  return { success: true, data: undefined };
}
