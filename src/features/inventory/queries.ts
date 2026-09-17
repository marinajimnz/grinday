import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type InventoryBagRow = Database["public"]["Tables"]["coffee_bags"]["Row"] & {
  // archived_at rides along because the row's menu needs to know whether it's
  // offering "Archivar" or "Desarchivar" — see BagInventoryRow.
  coffee: { id: string; name: string; roaster: string; archived_at: string | null };
};

export type GroupedInventoryBags = {
  active: InventoryBagRow[];
  finished: InventoryBagRow[];
  archived: InventoryBagRow[];
};

// A bag's own status (sealed/open/finished/archived) is independent from
// its coffee's — archiving a coffee never touches its bags' status rows.
// So a bag belongs under "archivados" either because it was archived on
// its own, or because its coffee was (regardless of the bag's own status —
// an archived coffee's still-"open" bag belongs here too, not under
// Activos). PostgREST's `.or()` can't express a condition on a joined
// table's column (confirmed against the live project: it fails to parse
// the logic tree), so this fetches every bag once and buckets it in JS
// instead of running three separately-filtered queries.
export async function listBagsGrouped(supabase: Client): Promise<GroupedInventoryBags> {
  const { data, error } = await supabase
    .from("coffee_bags")
    .select("*, coffee:coffees!inner(id, name, roaster, archived_at)")
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const active: InventoryBagRow[] = [];
  const finished: InventoryBagRow[] = [];
  const archived: InventoryBagRow[] = [];
  for (const bag of data ?? []) {
    const coffeeArchived = bag.coffee.archived_at !== null;
    if (bag.status === "archived" || coffeeArchived) archived.push(bag);
    else if (bag.status === "finished") finished.push(bag);
    else active.push(bag);
  }
  return { active, finished, archived };
}
