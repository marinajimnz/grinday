import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { attachSignedUrls } from "@/lib/supabase/storage";

type Client = SupabaseClient<Database>;

export type BrewAttemptRow = Database["public"]["Tables"]["brew_attempts"]["Row"];
export type AttemptMediaRow = Database["public"]["Tables"]["attempt_media"]["Row"];

export async function listAttemptsForCoffee(supabase: Client, coffeeId: string) {
  const { data, error } = await supabase
    .from("brew_attempts")
    .select("*")
    .eq("coffee_id", coffeeId)
    .order("attempt_no", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAttempt(supabase: Client, attemptId: string) {
  const { data, error } = await supabase
    .from("brew_attempts")
    // Disambiguate: coffees<->brew_attempts has two FKs (coffee_id, and
    // coffees.preferred_attempt_id pointing back), so the embed is ambiguous
    // unless we name the constraint to use.
    .select("*, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster, preferred_attempt_id)")
    .eq("id", attemptId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAttemptsByIds(supabase: Client, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("brew_attempts").select("*").in("id", ids);
  if (error) throw error;
  const byId = new Map(data?.map((a) => [a.id, a]) ?? []);
  return ids.map((id) => byId.get(id)).filter((a): a is BrewAttemptRow => Boolean(a));
}

export async function getUserDefaultMachine(supabase: Client) {
  const { data, error } = await supabase
    .from("user_machines")
    .select("*, machine_model:machine_models(*)")
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAttemptMedia(supabase: Client, attemptId: string) {
  const { data, error } = await supabase
    .from("attempt_media")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return attachSignedUrls(supabase, data ?? []);
}

// Only what BrewPicker's "receta preferida" badge needs to display — the
// actual recipe values for a new brew are seeded per (coffee, method) by
// getLastAttemptForCoffeeAndMethod below, not from this preferred pointer.
const PREFERRED_ATTEMPT_RECIPE_FIELDS = "id, attempt_no";

export type BrewableCoffee = {
  coffeeId: string;
  name: string;
  roaster: string;
  bagId: string;
  preferredAttempt: Pick<BrewAttemptRow, "id" | "attempt_no"> | null;
};

const RECIPE_SOURCE_ATTEMPT_FIELDS =
  "id, attempt_no, method, dose_g, water_g, target_weight_g, temperature_c, target_time_ms, grind_setting, moka_cup_size, heat_intensity, equipment_id, grinder_id, equipment_snapshot";

// The recipe defaults for a new brew come from the most recent attempt
// logged for this exact (coffee, method) pair — not the coffee's single
// starred "preferred" attempt, which may have been brewed with a different
// method entirely.
export async function getLastAttemptForCoffeeAndMethod(
  supabase: Client,
  coffeeId: string,
  method: string,
) {
  const { data, error } = await supabase
    .from("brew_attempts")
    .select(RECIPE_SOURCE_ATTEMPT_FIELDS)
    .eq("coffee_id", coffeeId)
    .eq("method", method)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Coffees the user can start a brew for: at least one bag that isn't
// finished/archived, picking the most relevant one (open, else sealed, else
// most recent) the same way the coffee detail page does.
export async function listBrewableCoffees(supabase: Client): Promise<BrewableCoffee[]> {
  const { data: coffees, error } = await supabase
    .from("coffees")
    .select("id, name, roaster, preferred_attempt_id")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!coffees?.length) return [];

  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("id, coffee_id, status, created_at")
    .in(
      "coffee_id",
      coffees.map((c) => c.id),
    )
    .order("created_at", { ascending: false });
  if (bagsError) throw bagsError;

  const preferredIds = coffees.map((c) => c.preferred_attempt_id).filter((id): id is string => Boolean(id));
  const { data: preferredAttempts } = preferredIds.length
    ? await supabase.from("brew_attempts").select(PREFERRED_ATTEMPT_RECIPE_FIELDS).in("id", preferredIds)
    : { data: [] };
  const preferredById = new Map((preferredAttempts ?? []).map((a) => [a.id, a]));

  const result: BrewableCoffee[] = [];
  for (const coffee of coffees) {
    const coffeeBags = (bags ?? []).filter((b) => b.coffee_id === coffee.id);
    const target =
      coffeeBags.find((b) => b.status === "open") ??
      coffeeBags.find((b) => b.status === "sealed") ??
      coffeeBags[0];
    if (!target) continue;

    result.push({
      coffeeId: coffee.id,
      name: coffee.name,
      roaster: coffee.roaster,
      bagId: target.id,
      preferredAttempt: coffee.preferred_attempt_id
        ? (preferredById.get(coffee.preferred_attempt_id) ?? null)
        : null,
    });
  }
  return result;
}
