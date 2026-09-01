"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  attemptFieldsSchema,
  createAttemptSchema,
  registerAttemptMediaSchema,
  setPreferredAttemptSchema,
  updateAttemptSchema,
} from "@/lib/validation/attempts";
import { getUserDefaultMachine } from "./queries";
import type { Database, Json } from "@/types/database";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

type AttemptFields = Database["public"]["Tables"]["brew_attempts"]["Insert"];

function toAttemptRow(
  input: z.infer<typeof attemptFieldsSchema>,
): Omit<AttemptFields, "id" | "user_id" | "coffee_id" | "coffee_bag_id" | "machine_id"> {
  return {
    grind_setting: input.grindSetting,
    grind_seconds: input.grindSeconds,
    dose_mode: input.doseMode,
    dose_feedback: input.doseFeedback ?? null,
    used_bit_more: input.usedBitMore,
    basket_size: input.basketSize,
    basket_wall: input.basketWall ?? null,
    temperature_offset_c: input.temperatureOffsetC ?? null,
    upper_burr_setting: input.upperBurrSetting ?? null,
    shot_mode: input.shotMode,
    extraction_ms: input.extractionMs ?? null,
    preinfusion_ms: input.preinfusionMs ?? null,
    pressure_observation: input.pressureObservation ?? null,
    input_weight_g: input.inputWeightG ?? null,
    output_weight_g: input.outputWeightG ?? null,
    output_volume_ml: input.outputVolumeMl ?? null,
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

export async function createAttemptAction(
  rawInput: unknown,
): Promise<ActionResult<{ attemptId: string }>> {
  const parsed = createAttemptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { coffeeBagId, parentAttemptId, idempotencyKey, attempt } = parsed.data;

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
    if (existing) return { success: true, data: { attemptId: existing.id } };
  }

  const { data: bag, error: bagError } = await supabase
    .from("coffee_bags")
    .select("id, coffee_id, inventory_mode, estimated_dose_g")
    .eq("id", coffeeBagId)
    .maybeSingle();
  if (bagError) return { success: false, message: bagError.message };
  if (!bag) return { success: false, message: "Bolsa no encontrada" };

  const machine = await getUserDefaultMachine(supabase);
  if (!machine) {
    return {
      success: false,
      message: "Selecciona una máquina en Ajustes → Máquinas antes de registrar un intento.",
    };
  }

  const machineSnapshot: Json = {
    machine_model_slug: machine.machine_model?.slug ?? null,
    capabilities_version: machine.machine_model?.capabilities_version ?? null,
    capabilities: machine.machine_model?.capabilities ?? {},
    user_settings: machine.settings,
  };

  const { data: inserted, error } = await supabase
    .from("brew_attempts")
    .insert({
      ...toAttemptRow(attempt),
      user_id: user.id,
      coffee_id: bag.coffee_id,
      coffee_bag_id: bag.id,
      machine_id: machine.id,
      parent_attempt_id: parentAttemptId ?? null,
      idempotency_key: idempotencyKey ?? null,
      machine_snapshot: machineSnapshot,
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
      if (existing) return { success: true, data: { attemptId: existing.id } };
    }
    return { success: false, message: error.message };
  }

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

  revalidatePath(`/coffees/${bag.coffee_id}`);
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
