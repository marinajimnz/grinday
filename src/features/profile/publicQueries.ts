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
 * (viewed by anyone other than its owner), resolves to `null` here —
 * RLS's `profiles_select_public`/`profiles_select_own` policies are what
 * actually decide visibility, this just surfaces "not found" for the page
 * to 404 on.
 */
export async function getPublicProfileByUsername(
  supabase: Client,
  username: string,
): Promise<PublicProfileData | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (profileError) throw profileError;
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
      .in("id", preferredIds);
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
