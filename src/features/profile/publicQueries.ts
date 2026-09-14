import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type PublicProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type PublicCoffee = Database["public"]["Tables"]["coffees"]["Row"];
export type PublicBrewAttempt = Database["public"]["Tables"]["brew_attempts"]["Row"];
type UserMachineRow = Database["public"]["Tables"]["user_machines"]["Row"];
type UserGrinderRow = Database["public"]["Tables"]["user_grinders"]["Row"];
type UserBrewEquipmentRow = Database["public"]["Tables"]["user_brew_equipment"]["Row"];

export type PublicCoffeeItem = PublicCoffee & {
  preferredAttempt: PublicBrewAttempt | null;
};

export type PublicMachine = UserMachineRow & {
  machineModel: { brand: string; model_name: string } | null;
};

export type PublicEquipment = {
  machines: PublicMachine[];
  grinders: UserGrinderRow[];
  brewEquipment: UserBrewEquipmentRow[];
};

export type PublicRecentAttempt = PublicBrewAttempt & {
  coffee: { id: string; name: string; roaster: string } | null;
};

export type PublicProfileData = {
  profile: PublicProfile;
  coffees: PublicCoffeeItem[];
  equipment: PublicEquipment;
  recentAttempts: PublicRecentAttempt[];
};

const RECENT_ATTEMPTS_LIMIT = 10;

/**
 * A username that doesn't exist, or whose profile has is_public = false
 * (looked up by anyone other than its owner), resolves to `null` here —
 * RLS's `profiles_select_public`/`profiles_select_own` policies are what
 * actually decide visibility, this just surfaces "not found" to the caller.
 * Used both for the full profile page and for the lighter followers/
 * following list pages, which don't need coffees/equipment/attempts too.
 */
export async function getProfileByUsername(
  supabase: Client,
  username: string,
): Promise<PublicProfile | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return profile;
}

export type ProfileSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const SEARCH_PAGE_SIZE = 20;

/**
 * `ilike` on username and display_name — RLS (profiles_select_public /
 * _own) is what actually keeps non-public profiles out of results, same
 * as everywhere else in this feature; no need to duplicate is_public here.
 */
export async function searchProfiles(
  supabase: Client,
  query: string,
  page = 0,
): Promise<{ results: ProfileSearchResult[]; hasMore: boolean }> {
  const term = query.trim().replace(/[%,]/g, "");
  if (!term) return { results: [], hasMore: false };

  const from = page * SEARCH_PAGE_SIZE;
  const to = from + SEARCH_PAGE_SIZE; // one extra row to detect a next page

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .order("username", { ascending: true })
    .range(from, to);
  if (error) throw error;

  const rows = data ?? [];
  return { results: rows.slice(0, SEARCH_PAGE_SIZE), hasMore: rows.length > SEARCH_PAGE_SIZE };
}

export async function getPublicProfileByUsername(
  supabase: Client,
  username: string,
): Promise<PublicProfileData | null> {
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) return null;

  const userId = profile.id;

  const [coffeesResult, machinesResult, grindersResult, brewEquipmentResult, attemptsResult] =
    await Promise.all([
      supabase
        .from("coffees")
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("user_machines")
        .select("*, machineModel:machine_models(brand, model_name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_grinders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_brew_equipment")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("brew_attempts")
        .select("*, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(RECENT_ATTEMPTS_LIMIT),
    ]);

  if (coffeesResult.error) throw coffeesResult.error;
  if (machinesResult.error) throw machinesResult.error;
  if (grindersResult.error) throw grindersResult.error;
  if (brewEquipmentResult.error) throw brewEquipmentResult.error;
  if (attemptsResult.error) throw attemptsResult.error;

  const coffees = coffeesResult.data ?? [];
  const preferredIds = coffees
    .map((coffee) => coffee.preferred_attempt_id)
    .filter((id): id is string => id != null);

  const preferredById = new Map<string, PublicBrewAttempt>();
  if (preferredIds.length) {
    const { data: preferredAttempts, error: preferredError } = await supabase
      .from("brew_attempts")
      .select("*")
      .in("id", preferredIds)
      .eq("user_id", userId);
    if (preferredError) throw preferredError;
    for (const attempt of preferredAttempts ?? []) preferredById.set(attempt.id, attempt);
  }

  return {
    profile,
    coffees: coffees.map((coffee) => ({
      ...coffee,
      preferredAttempt: coffee.preferred_attempt_id
        ? (preferredById.get(coffee.preferred_attempt_id) ?? null)
        : null,
    })),
    equipment: {
      machines: (machinesResult.data ?? []) as PublicMachine[],
      grinders: grindersResult.data ?? [],
      brewEquipment: brewEquipmentResult.data ?? [],
    },
    recentAttempts: (attemptsResult.data ?? []) as PublicRecentAttempt[],
  };
}
