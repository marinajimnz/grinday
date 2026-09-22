import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { attachSignedUrls } from "@/lib/supabase/storage";
import { sumCups } from "@/features/attempts/cups";
import { hasBrewableBag } from "./brewable";

type Client = SupabaseClient<Database>;

export type CoffeeRow = Database["public"]["Tables"]["coffees"]["Row"];
export type CoffeeBagRow = Database["public"]["Tables"]["coffee_bags"]["Row"];
export type CoffeeMediaRow = Database["public"]["Tables"]["coffee_media"]["Row"];

export type CoffeeListItem = CoffeeRow & {
  bags: Pick<CoffeeBagRow, "id" | "status" | "roast_date">[];
  coverPhotoUrl: string | null;
};

/**
 * How many cups came out of each bag, counted from the attempts logged
 * against it. Approximate by nature — it knows about the brews you wrote
 * down, not the ones you didn't — which is why the UI says "aprox.".
 *
 * Deliberately not derived from grams: inventory_mode is "none" on plenty
 * of bags, and on the rest remaining_g only moves when a brew goes through
 * the path that writes an inventory event. Counting the attempts is the
 * one measure that works the same on every bag.
 */
export async function countCupsByBag(
  supabase: Client,
  bagIds: string[],
): Promise<Map<string, number>> {
  const byBag = new Map<string, number>();
  if (!bagIds.length) return byBag;

  const { data, error } = await supabase
    .from("brew_attempts")
    .select("coffee_bag_id, cup_count, moka_cup_size")
    .in("coffee_bag_id", bagIds);
  if (error) throw error;

  const grouped = new Map<string, { cup_count: number | null; moka_cup_size: number | null }[]>();
  for (const attempt of data ?? []) {
    if (!attempt.coffee_bag_id) continue;
    const list = grouped.get(attempt.coffee_bag_id) ?? [];
    list.push(attempt);
    grouped.set(attempt.coffee_bag_id, list);
  }
  for (const id of bagIds) byBag.set(id, sumCups(grouped.get(id) ?? []));
  return byBag;
}

export type CoffeeLibraryFilters = {
  q?: string;
  process?: string;
  roastLevel?: string;
  bagStatus?: string;
};

export async function listCoffees(
  supabase: Client,
  userId: string,
  filters: CoffeeLibraryFilters = {},
): Promise<CoffeeListItem[]> {
  let query = supabase
    .from("coffees")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, "");
    query = query.or(
      `name.ilike.%${term}%,roaster.ilike.%${term}%,country.ilike.%${term}%,region.ilike.%${term}%`,
    );
  }
  if (filters.process) {
    query = query.eq("process", filters.process);
  }
  if (filters.roastLevel) {
    query = query.eq("roast_level", filters.roastLevel);
  }

  const { data: coffees, error } = await query;
  if (error) throw error;
  if (!coffees?.length) return [];

  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("id, coffee_id, status, roast_date")
    .in(
      "coffee_id",
      coffees.map((c) => c.id),
    );
  if (bagsError) throw bagsError;

  const bagsByCoffee = new Map<string, CoffeeListItem["bags"]>();
  for (const bag of bags ?? []) {
    const list = bagsByCoffee.get(bag.coffee_id) ?? [];
    list.push({ id: bag.id, status: bag.status, roast_date: bag.roast_date });
    bagsByCoffee.set(bag.coffee_id, list);
  }

  // The card shows one cover photo per coffee: the "package_front" shot on
  // whichever bag is active (same bag CoffeeCard itself treats as active).
  const activeBagIdByCoffee = new Map<string, string>();
  for (const [coffeeId, coffeeBags] of bagsByCoffee) {
    const active = coffeeBags.find((b) => b.status === "open") ?? coffeeBags[0];
    if (active) activeBagIdByCoffee.set(coffeeId, active.id);
  }
  const activeBagIds = [...activeBagIdByCoffee.values()];

  const coverUrlByBag = new Map<string, string>();
  if (activeBagIds.length) {
    const { data: coverMedia, error: coverError } = await supabase
      .from("coffee_media")
      .select("coffee_bag_id, storage_path")
      .in("coffee_bag_id", activeBagIds)
      .eq("kind", "package_front")
      .order("created_at", { ascending: true });
    if (coverError) throw coverError;

    const withUrls = await attachSignedUrls(supabase, coverMedia ?? []);
    for (const item of withUrls) {
      if (item.url && !coverUrlByBag.has(item.coffee_bag_id)) {
        coverUrlByBag.set(item.coffee_bag_id, item.url);
      }
    }
  }

  let items: CoffeeListItem[] = coffees.map((coffee) => {
    const activeBagId = activeBagIdByCoffee.get(coffee.id);
    return {
      ...coffee,
      bags: bagsByCoffee.get(coffee.id) ?? [],
      coverPhotoUrl: (activeBagId && coverUrlByBag.get(activeBagId)) || null,
    };
  });

  if (filters.bagStatus) {
    items = items.filter((item) =>
      item.bags.some((bag) => bag.status === filters.bagStatus),
    );
  }

  // A coffee you can still brew comes first. Once every bag is finished or
  // archived — or there were never any — the coffee is history, and history
  // shouldn't sit at the top of a list you open to decide what to make.
  // Within each group the order is unchanged (most recently touched first),
  // which is what makes this a stable partition rather than a second sort.
  const brewable = items.filter(hasBrewableBag);
  const spent = items.filter((item) => !hasBrewableBag(item));
  return [...brewable, ...spent];
}

export async function getCoffeeWithBags(supabase: Client, coffeeId: string, userId: string) {
  const { data: coffee, error } = await supabase
    .from("coffees")
    .select("*")
    .eq("id", coffeeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!coffee) return null;

  const { data: bags, error: bagsError } = await supabase
    .from("coffee_bags")
    .select("*")
    .eq("coffee_id", coffeeId)
    .order("created_at", { ascending: false });
  if (bagsError) throw bagsError;

  return { coffee, bags: bags ?? [] };
}

// The coffee detail page shows every bag's full panel inline (dates,
// inventory, photos) instead of linking out to a separate page per bag, so
// it needs each bag's media up front, grouped by bag id.
export async function listMediaForBags(supabase: Client, bagIds: string[]) {
  if (!bagIds.length) return new Map<string, (CoffeeMediaRow & { url: string | null })[]>();

  const { data: media, error } = await supabase
    .from("coffee_media")
    .select("*")
    .in("coffee_bag_id", bagIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const mediaWithUrls = await attachSignedUrls(supabase, media ?? []);

  const byBag = new Map<string, (CoffeeMediaRow & { url: string | null })[]>();
  for (const item of mediaWithUrls) {
    const list = byBag.get(item.coffee_bag_id) ?? [];
    list.push(item);
    byBag.set(item.coffee_bag_id, list);
  }
  return byBag;
}

export async function getBagDetail(supabase: Client, bagId: string) {
  const { data: bag, error } = await supabase
    .from("coffee_bags")
    .select("*, coffee:coffees(id, name, roaster)")
    .eq("id", bagId)
    .maybeSingle();
  if (error) throw error;
  if (!bag) return null;

  const { data: media, error: mediaError } = await supabase
    .from("coffee_media")
    .select("*")
    .eq("coffee_bag_id", bagId)
    .order("created_at", { ascending: true });
  if (mediaError) throw mediaError;

  const mediaWithUrls = await attachSignedUrls(supabase, media ?? []);

  return { bag, media: mediaWithUrls };
}
