import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeCardAttempt } from "@/components/attempt/RecipeCard";
import { RECIPE_SOURCE_ATTEMPT_FIELDS } from "@/features/attempts/queries";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type RecentAttempt = {
  id: string;
  attempt_no: number;
  method: string;
  created_at: string;
  dose_g: number | null;
  water_g: number | null;
  target_weight_g: number | null;
  output_weight_g: number | null;
  extraction_ms: number | null;
  overall_rating: number | null;
  hidden_from_dashboard: boolean;
  coffee: { id: string; name: string; roaster: string } | null;
};

const RECENT_ATTEMPT_FIELDS =
  "id, attempt_no, method, created_at, dose_g, water_g, target_weight_g, output_weight_g, extraction_ms, overall_rating, hidden_from_dashboard, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster)";

// The dashboard's own "recent" list respects "Quitar del inicio" (a
// per-attempt opt-out that keeps the attempt everywhere else — its coffee's
// history, /attempts — just off this specific list); every other caller of
// this query (the full /attempts page included) leaves it out on purpose.
export async function getRecentAttempts(
  supabase: Client,
  userId: string,
  limit = 4,
  options?: { excludeHiddenFromDashboard?: boolean },
): Promise<RecentAttempt[]> {
  let query = supabase
    .from("brew_attempts")
    .select(RECENT_ATTEMPT_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options?.excludeHiddenFromDashboard) {
    query = query.eq("hidden_from_dashboard", false);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type DashboardRecipe = {
  attempt: RecipeCardAttempt;
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  targetBagId: string;
  // Whether the recipe shown is the coffee's pinned "receta preferida" or
  // just the last thing brewed — the card labels itself from this.
  isPreferred: boolean;
};

const RECIPE_CARD_FIELDS = `${RECIPE_SOURCE_ATTEMPT_FIELDS}, grind_seconds, extraction_ms, output_weight_g`;

// What the dashboard puts in its prime slot: the recipe for the coffee
// you're currently drinking. The coffee's pinned preferred recipe wins when
// there is one — repeating the brew that worked is the point — and the last
// attempt stands in otherwise. "Quitar del inicio" is respected when picking
// which coffee that is, the same way the recent list does it; a pinned
// preferred recipe still shows, because hiding one attempt from a list isn't
// the same as unpinning the coffee's recipe.
export async function getDashboardRecipe(
  supabase: Client,
  userId: string,
): Promise<DashboardRecipe | null> {
  const { data: recent, error } = await supabase
    .from("brew_attempts")
    .select(
      `${RECIPE_CARD_FIELDS}, coffee_id, coffee_bag_id, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster, preferred_attempt_id)`,
    )
    .eq("user_id", userId)
    .eq("hidden_from_dashboard", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!recent?.coffee) return null;

  const { coffee } = recent;
  const preferredId = coffee.preferred_attempt_id;

  const [preferred, { data: bags, error: bagsError }] = await Promise.all([
    preferredId && preferredId !== recent.id
      ? supabase
          .from("brew_attempts")
          .select(RECIPE_CARD_FIELDS)
          .eq("id", preferredId)
          .eq("user_id", userId)
          .maybeSingle()
          .then(({ data }) => data)
      : Promise.resolve(null),
    supabase
      .from("coffee_bags")
      .select("id, status")
      .eq("coffee_id", coffee.id)
      .eq("user_id", userId),
  ]);
  if (bagsError) throw bagsError;

  // Same order the coffee page and the brew picker use: brew from the bag
  // that's actually open, not whichever one this attempt happened to use.
  const targetBag =
    bags?.find((b) => b.status === "open") ?? bags?.find((b) => b.status === "sealed") ?? bags?.[0];

  return {
    attempt: preferred ?? recent,
    coffeeId: coffee.id,
    coffeeName: coffee.name,
    roaster: coffee.roaster,
    targetBagId: targetBag?.id ?? recent.coffee_bag_id,
    isPreferred: Boolean(preferred) || preferredId === recent.id,
  };
}

export async function hasAnyCoffee(supabase: Client, userId: string) {
  const { count, error } = await supabase
    .from("coffees")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null);
  if (error) throw error;
  return (count ?? 0) > 0;
}
