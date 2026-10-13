import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { attachSignedUrls } from "@/lib/supabase/storage";
import { pickTargetBag } from "./brewTarget";
import { listCoverUrlsByCoffee } from "@/features/coffees/queries";
import { groupFavouritesByCoffee } from "./favourites";
import type { FavouriteGroup, FavouriteRecipe } from "./favourites";
import type { RecipeSourceAttempt } from "@/features/brew/draft";

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
    .select(
      "*, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster, preferred_attempt_id), bag:coffee_bags(roast_date)",
    )
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

// What BrewPicker's "receta favorita" badge needs to display, plus the
// method it was brewed with: a preferred V60 recipe says nothing about the
// espresso you're about to pull, so both the badge and the seeding in
// startBrewAction have to check it before claiming anything.
const PREFERRED_ATTEMPT_RECIPE_FIELDS = "id, attempt_no, method";

export type BrewableCoffee = {
  coffeeId: string;
  name: string;
  roaster: string;
  bagId: string;
  /** The roast date of that bag — how old the coffee you'd brew is. */
  roastDate: string | null;
  coverPhotoUrl: string | null;
  preferredAttempt: Pick<BrewAttemptRow, "id" | "attempt_no" | "method"> | null;
};

export const RECIPE_SOURCE_ATTEMPT_FIELDS =
  "id, attempt_no, method, dose_g, water_g, dilution_water_g, target_weight_g, temperature_c, target_time_ms, grind_setting, grinder_upper_burr, grinder_lower_burr, moka_cup_size, cup_count, heat_intensity, basket_type, equipment_id, grinder_id, equipment_snapshot";

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
    .select("id, coffee_id, status, created_at, roast_date")
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

  const targetBagByCoffee = new Map<string, { id: string; coffee_id: string; roast_date: string | null }>();
  for (const coffee of coffees) {
    const coffeeBags = (bags ?? []).filter((b) => b.coffee_id === coffee.id);
    // Open first, then sealed — and then nothing. The fallback used to be
    // "whatever bag exists", which put coffees whose every bag was finished
    // or archived in the picker, pointed at a bag with nothing left in it.
    // A coffee with no bag to brew from is dropped below (`if (!target)`).
    const target = pickTargetBag(coffeeBags);
    if (target) targetBagByCoffee.set(coffee.id, target);
  }

  // Same idea as the coffee library's card cover photo, seen from the bag
  // you'd actually brew from — makes the picker in /brew/new recognizable at
  // a glance instead of every row showing the same generic cup icon.
  const coverUrlByCoffee = await listCoverUrlsByCoffee(
    supabase,
    bags ?? [],
    new Map([...targetBagByCoffee].map(([coffeeId, bag]) => [coffeeId, bag.id])),
  );

  const result: BrewableCoffee[] = [];
  for (const coffee of coffees) {
    const target = targetBagByCoffee.get(coffee.id);
    if (!target) continue;

    result.push({
      coffeeId: coffee.id,
      name: coffee.name,
      roaster: coffee.roaster,
      bagId: target.id,
      roastDate: target.roast_date,
      coverPhotoUrl: coverUrlByCoffee.get(coffee.id) ?? null,
      preferredAttempt: coffee.preferred_attempt_id
        ? (preferredById.get(coffee.preferred_attempt_id) ?? null)
        : null,
    });
  }
  return result;
}

// The three numbers a recipe card shows, on top of what seeding a brew from it
// needs. Same set the dashboard's card selects — see features/dashboard/queries.
const FAVOURITE_CARD_FIELDS = `${RECIPE_SOURCE_ATTEMPT_FIELDS}, favourite_at, created_at, grind_seconds, extraction_ms, output_weight_g`;

export type FavouriteRecipeItem = FavouriteRecipe & {
  attempt: RecipeSourceAttempt & Pick<BrewAttemptRow, "grind_seconds" | "extraction_ms" | "output_weight_g">;
  /** The bag a new brew would come out of, or null when every bag is spent. */
  targetBagId: string | null;
  /** When it was brewed — what tells two recipes of the same method apart on
   *  a card, since the method alone repeats. The attempts table has no
   *  separate brew date; created_at is it, and it is what the timeline
   *  prints too. */
  brewedOn: string;
};

/**
 * Every recipe the user has starred, grouped by coffee. Reads the attempts
 * directly rather than going through coffees.preferred_attempt_id, which only
 * ever names one per coffee — that column is now a cache for the dashboard and
 * the public pages, not the list of favourites.
 */
export async function listFavouriteRecipes(
  supabase: Client,
  userId: string,
): Promise<FavouriteGroup<FavouriteRecipeItem>[]> {
  const { data: attempts, error } = await supabase
    .from("brew_attempts")
    .select(
      `${FAVOURITE_CARD_FIELDS}, coffee_id, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster, archived_at)`,
    )
    .eq("user_id", userId)
    .not("favourite_at", "is", null)
    .order("favourite_at", { ascending: false });
  if (error) throw error;

  // An archived coffee is one you've put away; its recipes go with it rather
  // than sitting at the top of this page forever.
  const rows = (attempts ?? []).filter((row) => row.coffee && !row.coffee.archived_at);
  if (!rows.length) return [];

  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("id, coffee_id, status, created_at")
    .in("coffee_id", [...new Set(rows.map((row) => row.coffee_id))])
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (bagsError) throw bagsError;

  const targetBagByCoffee = new Map<string, string>();
  for (const coffeeId of new Set(rows.map((row) => row.coffee_id))) {
    const target = pickTargetBag((bags ?? []).filter((bag) => bag.coffee_id === coffeeId));
    if (target) targetBagByCoffee.set(coffeeId, target.id);
  }

  return groupFavouritesByCoffee(
    rows.map(({ coffee, coffee_id, favourite_at, created_at, ...attempt }) => ({
      coffeeId: coffee_id,
      coffeeName: coffee!.name,
      roaster: coffee!.roaster,
      brewable: targetBagByCoffee.has(coffee_id),
      // Not null: the query asked for rows where it isn't.
      favouriteAt: favourite_at!,
      targetBagId: targetBagByCoffee.get(coffee_id) ?? null,
      brewedOn: created_at,
      attempt,
    })),
  );
}

/** How many recipes are starred in all — what the dashboard needs to know
 *  whether linking to the favourites page would show anything new. */
export async function countFavouriteRecipes(supabase: Client, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("brew_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("favourite_at", "is", null);
  if (error) throw error;
  return count ?? 0;
}
