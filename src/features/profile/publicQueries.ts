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
