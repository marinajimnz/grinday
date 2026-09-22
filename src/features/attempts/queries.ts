import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { attachSignedUrls } from "@/lib/supabase/storage";
import { pickTargetBag } from "./brewTarget";

type Client = SupabaseClient<Database>;

export type BrewAttemptRow = Database["public"]["Tables"]["brew_attempts"]["Row"];
export type AttemptMediaRow = Database["public"]["Tables"]["attempt_media"]["Row"];

export async function listAttemptsForCoffee(supabase: Client, coffeeId: string, userId: string) {
  const { data, error } = await supabase
    .from("brew_attempts")
    .select("*")
    .eq("coffee_id", coffeeId)
    .eq("user_id", userId)
    .order("attempt_no", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAttempt(supabase: Client, attemptId: string, userId: string) {
  const { data, error } = await supabase
    .from("brew_attempts")
    // Disambiguate: coffees<->brew_attempts has two FKs (coffee_id, and
    // coffees.preferred_attempt_id pointing back), so the embed is ambiguous
    // unless we name the constraint to use.
    .select("*, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster, preferred_attempt_id)")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAttemptsByIds(supabase: Client, ids: string[], userId: string) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("brew_attempts")
    .select("*")
    .in("id", ids)
    .eq("user_id", userId);
  if (error) throw error;
  const byId = new Map(data?.map((a) => [a.id, a]) ?? []);
  return ids.map((id) => byId.get(id)).filter((a): a is BrewAttemptRow => Boolean(a));
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

// What BrewPicker's "receta preferida" badge needs to display, plus the
// method it was brewed with: a preferred V60 recipe says nothing about the
// espresso you're about to pull, so both the badge and the seeding in
// startBrewAction have to check it before claiming anything.
const PREFERRED_ATTEMPT_RECIPE_FIELDS = "id, attempt_no, method";

export type BrewableCoffee = {
  coffeeId: string;
  name: string;
  roaster: string;
  bagId: string;
  coverPhotoUrl: string | null;
  preferredAttempt: Pick<BrewAttemptRow, "id" | "attempt_no" | "method"> | null;
};

export const RECIPE_SOURCE_ATTEMPT_FIELDS =
  "id, attempt_no, method, dose_g, water_g, dilution_water_g, target_weight_g, temperature_c, target_time_ms, grind_setting, grinder_upper_burr, grinder_lower_burr, moka_cup_size, cup_count, heat_intensity, equipment_id, grinder_id, equipment_snapshot";

// The recipe defaults for a new brew come from the most recent attempt
// logged for this exact (coffee, method) pair — not the coffee's single
// starred "preferred" attempt, which may have been brewed with a different
// method entirely.
export async function getLastAttemptForCoffeeAndMethod(
  supabase: Client,
  coffeeId: string,
  method: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("brew_attempts")
    .select(RECIPE_SOURCE_ATTEMPT_FIELDS)
    .eq("coffee_id", coffeeId)
    .eq("method", method)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Coffees the user can start a brew for: at least one bag that isn't
// finished/archived, picking the most relevant one (open, else sealed, else
// most recent) the same way the coffee detail page does.
export async function listBrewableCoffees(supabase: Client, userId: string): Promise<BrewableCoffee[]> {
  const { data: coffees, error } = await supabase
    .from("coffees")
    .select("id, name, roaster, preferred_attempt_id")
    .eq("user_id", userId)
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
    ? await supabase
        .from("brew_attempts")
        .select(PREFERRED_ATTEMPT_RECIPE_FIELDS)
        .in("id", preferredIds)
        .eq("user_id", userId)
    : { data: [] };
  const preferredById = new Map((preferredAttempts ?? []).map((a) => [a.id, a]));

  const targetBagByCoffee = new Map<string, { id: string; coffee_id: string }>();
  for (const coffee of coffees) {
    const coffeeBags = (bags ?? []).filter((b) => b.coffee_id === coffee.id);
    // Open first, then sealed — and then nothing. The fallback used to be
    // "whatever bag exists", which put coffees whose every bag was finished
    // or archived in the picker, pointed at a bag with nothing left in it.
    // A coffee with no bag to brew from is dropped below (`if (!target)`).
    const target = pickTargetBag(coffeeBags);
    if (target) targetBagByCoffee.set(coffee.id, target);
  }

  // Same idea as the coffee library's card cover photo: the "package_front"
  // shot on whichever bag is the one you'd actually brew from — makes the
  // picker in /brew/new recognizable at a glance instead of every row
  // showing the same generic cup icon.
  const targetBagIds = [...targetBagByCoffee.values()].map((b) => b.id);
  const coverUrlByBag = new Map<string, string>();
  if (targetBagIds.length) {
    const { data: coverMedia, error: coverError } = await supabase
      .from("coffee_media")
      .select("coffee_bag_id, storage_path")
      .in("coffee_bag_id", targetBagIds)
      .eq("kind", "package_front")
      .order("created_at", { ascending: true });
    if (coverError) throw coverError;

    const withUrls = await attachSignedUrls(supabase, coverMedia ?? []);
    for (const item of withUrls) {
      if (item.url && !coverUrlByBag.has(item.coffee_bag_id)) {
        coverUrlByBag.set(item.coffee_bag_id, item.url);
      }
    }
  }

  const result: BrewableCoffee[] = [];
  for (const coffee of coffees) {
    const target = targetBagByCoffee.get(coffee.id);
    if (!target) continue;

    result.push({
      coffeeId: coffee.id,
      name: coffee.name,
      roaster: coffee.roaster,
      bagId: target.id,
      coverPhotoUrl: coverUrlByBag.get(target.id) ?? null,
      preferredAttempt: coffee.preferred_attempt_id
        ? (preferredById.get(coffee.preferred_attempt_id) ?? null)
        : null,
    });
  }
  return result;
}
