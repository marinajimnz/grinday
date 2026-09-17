import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BrewMethod } from "./constants";

type Client = SupabaseClient<Database>;

export async function getUserGrinders(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("user_grinders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getUserBrewEquipment(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("user_brew_equipment")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// The equipment used for a brew is picked silently: the method's ⭐
// default, falling back to whichever entry for that method was added
// first when nothing is starred yet.
export async function getDefaultEquipmentForMethod(supabase: Client, method: BrewMethod, userId: string) {
  const { data, error } = await supabase
    .from("user_brew_equipment")
    .select("*")
    .eq("user_id", userId)
    .eq("method", method)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDefaultGrinder(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("user_grinders")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
