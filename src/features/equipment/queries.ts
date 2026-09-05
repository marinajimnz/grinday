import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function getUserGrinders(supabase: Client) {
  const { data, error } = await supabase
    .from("user_grinders")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getUserBrewEquipment(supabase: Client) {
  const { data, error } = await supabase
    .from("user_brew_equipment")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function hasAnyBrewEquipment(supabase: Client) {
  const { count, error } = await supabase
    .from("user_brew_equipment")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}
