import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type BrewAttemptRow = Database["public"]["Tables"]["brew_attempts"]["Row"];

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
