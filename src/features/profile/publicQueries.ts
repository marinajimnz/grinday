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
