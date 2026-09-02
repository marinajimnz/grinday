import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type InventoryBagRow = Database["public"]["Tables"]["coffee_bags"]["Row"] & {
  coffee: { id: string; name: string; roaster: string };
};

async function listBagsByStatus(supabase: Client, statuses: string[]): Promise<InventoryBagRow[]> {
  const { data, error } = await supabase
    .from("coffee_bags")
    .select("*, coffee:coffees(id, name, roaster)")
    .in("status", statuses)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveBags(supabase: Client) {
  return listBagsByStatus(supabase, ["open", "sealed"]);
}

export async function listFinishedBags(supabase: Client) {
  return listBagsByStatus(supabase, ["finished"]);
}

export async function listArchivedBags(supabase: Client) {
  return listBagsByStatus(supabase, ["archived"]);
}
