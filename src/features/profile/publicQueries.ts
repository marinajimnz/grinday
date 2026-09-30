import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type PublicProfileHeader = {
  username: string;
  displayName: string | null;
  bio: string | null;
  accountType: "person" | "roaster";
  coffeesCount: number;
  recipesCount: number;
  attemptsCount: number;
};

/**
 * Another account's public header, through get_public_profile() — the only
 * way to read it. Null for a profile that's private, suspended, not found,
 * or while the public side is off for the caller: the database answers all
 * of those the same way, and so does the page (a 404).
 */
export async function getPublicProfile(supabase: Client, username: string): Promise<PublicProfileHeader | null> {
  const { data, error } = await supabase.rpc("get_public_profile", { p_username: username });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    username: row.username,
    displayName: row.display_name ?? null,
    bio: row.bio ?? null,
    accountType: row.account_type === "roaster" ? "roaster" : "person",
    coffeesCount: row.coffees_count,
    recipesCount: row.recipes_count,
    attemptsCount: row.attempts_count,
  };
}

export type ProfileKind = "all" | "person" | "roaster";

export type ProfileSearchResult = {
  username: string;
  displayName: string | null;
  accountType: "person" | "roaster";
};

/**
 * Public profiles matching `query` by name or @username, through
 * search_profiles() — which already leaves out anything the profile page
 * wouldn't show, needs two characters and returns at most 20.
 */
export async function searchProfiles(
  supabase: Client,
  query: string,
  kind: ProfileKind,
): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase.rpc("search_profiles", { p_query: query, p_kind: kind });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    username: row.username,
    displayName: row.display_name ?? null,
    accountType: row.account_type === "roaster" ? "roaster" : "person",
  }));
}

export function parseProfileKind(value: string | undefined): ProfileKind {
  return value === "personas" ? "person" : value === "tostadoras" ? "roaster" : "all";
}

export type PublicCoffee = {
  id: string;
  name: string;
  roaster: string;
  country: string | null;
  process: string | null;
  hasRecipe: boolean;
  recipeMethod: string | null;
  recipeGrind: string | null;
};

export type PublicEquipment = { kind: string; modelName: string };

export type PublicAttempt = {
  id: string;
  brewedOn: string;
  method: string;
  coffeeName: string;
  roaster: string;
  cup_count: number | null;
  dose_g: number | null;
  water_g: number | null;
  dilution_water_g: number | null;
  target_weight_g: number | null;
  output_weight_g: number | null;
  extraction_ms: number | null;
  grind: string | null;
  overallRating: number | null;
};

export type PublicProfileContent = {
  coffees: PublicCoffee[];
  equipment: PublicEquipment[];
  attempts: PublicAttempt[];
};

// Postgres numerics come back as strings; the brew summary does maths.
const num = (value: unknown) => (value == null ? null : Number(value));

/**
 * Everything below a public profile's header, through the three F4
 * functions — each gated the same way as the header, so for a profile the
 * viewer can't see they all come back empty.
 */
export async function getPublicProfileContent(supabase: Client, username: string): Promise<PublicProfileContent> {
  const args = { p_username: username };
  const [coffees, equipment, attempts] = await Promise.all([
    supabase.rpc("get_public_coffees", args),
    supabase.rpc("get_public_equipment", args),
    supabase.rpc("get_public_recent_attempts", args),
  ]);
  for (const result of [coffees, equipment, attempts]) {
    if (result.error) throw result.error;
  }
  return {
    coffees: (coffees.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      roaster: row.roaster,
      country: row.country ?? null,
      process: row.process ?? null,
      hasRecipe: row.has_recipe,
      recipeMethod: row.recipe_method ?? null,
      recipeGrind: row.recipe_grind ?? null,
    })),
    equipment: (equipment.data ?? []).map((row) => ({ kind: row.kind, modelName: row.model_name })),
    attempts: (attempts.data ?? []).map((row) => ({
      id: row.id,
      brewedOn: row.brewed_on,
      method: row.method,
      coffeeName: row.coffee_name,
      roaster: row.roaster,
      cup_count: num(row.cup_count),
      dose_g: num(row.dose_g),
      water_g: num(row.water_g),
      dilution_water_g: num(row.dilution_water_g),
      target_weight_g: num(row.target_weight_g),
      output_weight_g: num(row.output_weight_g),
      extraction_ms: num(row.extraction_ms),
      grind: row.grind ?? null,
      overallRating: num(row.overall_rating),
    })),
  };
}

export type PublicCoffeeDetail = {
  name: string;
  roaster: string;
  country: string | null;
  region: string | null;
  farm: string | null;
  producer: string | null;
  varieties: string[];
  process: string | null;
  altitude_min_m: number | null;
  altitude_max_m: number | null;
  roast_level: string | null;
  tasting_notes: string[];
};

export type PublicCoffeeAttempt = Omit<PublicAttempt, "coffeeName" | "roaster"> & { isPreferred: boolean };

/**
 * One coffee of a public profile and the attempts shown with it (its latest
 * four plus its preferred recipe), through get_public_coffee() and
 * get_public_coffee_attempts(). Null when the viewer can't see it — an
 * archived coffee, another profile's, a private profile — all alike.
 */
export async function getPublicCoffee(
  supabase: Client,
  username: string,
  coffeeId: string,
): Promise<{ coffee: PublicCoffeeDetail; attempts: PublicCoffeeAttempt[] } | null> {
  const args = { p_username: username, p_coffee_id: coffeeId };
  const [coffee, attempts] = await Promise.all([
    supabase.rpc("get_public_coffee", args),
    supabase.rpc("get_public_coffee_attempts", args),
  ]);
  if (coffee.error) throw coffee.error;
  if (attempts.error) throw attempts.error;
  const row = coffee.data?.[0];
  if (!row) return null;
  return {
    coffee: {
      name: row.name,
      roaster: row.roaster,
      country: row.country ?? null,
      region: row.region ?? null,
      farm: row.farm ?? null,
      producer: row.producer ?? null,
      varieties: row.varieties ?? [],
      process: row.process ?? null,
      altitude_min_m: row.altitude_min_m ?? null,
      altitude_max_m: row.altitude_max_m ?? null,
      roast_level: row.roast_level ?? null,
      tasting_notes: row.tasting_notes ?? [],
    },
    attempts: (attempts.data ?? []).map((a) => ({
      id: a.id,
      isPreferred: a.is_preferred,
      brewedOn: a.brewed_on,
      method: a.method,
      cup_count: num(a.cup_count),
      dose_g: num(a.dose_g),
      water_g: num(a.water_g),
      dilution_water_g: num(a.dilution_water_g),
      target_weight_g: num(a.target_weight_g),
      output_weight_g: num(a.output_weight_g),
      extraction_ms: num(a.extraction_ms),
      grind: a.grind ?? null,
      overallRating: num(a.overall_rating),
    })),
  };
}

export type PublicAttemptDetail = {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  isPreferred: boolean;
  brewedOn: string;
  overallRating: number | null;
  grinderModelName: string | null;
  equipmentModelName: string | null;
  // Same names as the attempt row, so AttemptRecipeSummary can show it.
  recipe: {
    method: string;
    cup_count: number | null;
    dose_g: number | null;
    input_weight_g: number | null;
    water_g: number | null;
    dilution_water_g: number | null;
    target_weight_g: number | null;
    output_weight_g: number | null;
    extraction_ms: number | null;
    temperature_c: number | null;
    grind_setting: number | null;
    grind_seconds: number | null;
    grinder_upper_burr: number | null;
    grinder_lower_burr: number | null;
    moka_cup_size: number | null;
    heat_intensity: string | null;
    basket_type: string | null;
  };
};

/** One attempt's configuration, through get_public_attempt(); null when not visible. */
export async function getPublicAttempt(
  supabase: Client,
  username: string,
  attemptId: string,
): Promise<PublicAttemptDetail | null> {
  const { data, error } = await supabase.rpc("get_public_attempt", { p_username: username, p_attempt_id: attemptId });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    coffeeId: row.coffee_id,
    coffeeName: row.coffee_name,
    roaster: row.roaster,
    isPreferred: row.is_preferred,
    brewedOn: row.brewed_on,
    overallRating: num(row.overall_rating),
    grinderModelName: row.grinder_model_name ?? null,
    equipmentModelName: row.equipment_model_name ?? null,
    recipe: {
      method: row.method,
      cup_count: num(row.cup_count),
      dose_g: num(row.dose_g),
      input_weight_g: num(row.input_weight_g),
      water_g: num(row.water_g),
      dilution_water_g: num(row.dilution_water_g),
      target_weight_g: num(row.target_weight_g),
      output_weight_g: num(row.output_weight_g),
      extraction_ms: num(row.extraction_ms),
      temperature_c: num(row.temperature_c),
      grind_setting: num(row.grind_setting),
      grind_seconds: num(row.grind_seconds),
      grinder_upper_burr: num(row.grinder_upper_burr),
      grinder_lower_burr: num(row.grinder_lower_burr),
      moka_cup_size: num(row.moka_cup_size),
      heat_intensity: row.heat_intensity ?? null,
      basket_type: row.basket_type ?? null,
    },
  };
}

/** A route segment id that can't be a UUID never reaches the database. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export type Favourite =
  | { bookmarkId: string; available: true; username: string; displayName: string | null; accountType: "person" | "roaster" }
  | { bookmarkId: string; available: false };

/**
 * The caller's own saved profiles, newest first. One that has since gone
 * private or been suspended comes back with nothing but its bookmark id —
 * enough to remove it, not to say who it was.
 */
export async function getMyFavourites(supabase: Client): Promise<Favourite[]> {
  const { data, error } = await supabase.rpc("get_my_favourites");
  if (error) throw error;
  return (data ?? []).map((row) =>
    row.available && row.username
      ? {
          bookmarkId: row.bookmark_id,
          available: true,
          username: row.username,
          displayName: row.display_name ?? null,
          accountType: row.account_type === "roaster" ? "roaster" : "person",
        }
      : { bookmarkId: row.bookmark_id, available: false },
  );
}

export async function isProfileSaved(supabase: Client, username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_profile_saved", { p_username: username });
  if (error) throw error;
  return data === true;
}
