import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { attachSignedUrls } from "@/lib/supabase/storage";
import { sumCups } from "@/features/attempts/cups";
import { hasBrewableBag } from "./brewable";
import { pickCoverPhoto } from "./cover";

type Client = SupabaseClient<Database>;

export type CoffeeRow = Database["public"]["Tables"]["coffees"]["Row"];
export type CoffeeBagRow = Database["public"]["Tables"]["coffee_bags"]["Row"];
export type CoffeeMediaRow = Database["public"]["Tables"]["coffee_media"]["Row"];

export type CoffeeListItem = CoffeeRow & {
  bags: Pick<CoffeeBagRow, "id" | "status" | "roast_date">[];
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
  if (!bagIds.length) return new Map();

  const { data, error } = await supabase
    .from("brew_attempts")
    .select("coffee_bag_id, cup_count, moka_cup_size")
    .in("coffee_bag_id", bagIds);
  if (error) throw error;
  return cupsByBagFrom(data ?? [], bagIds);
}

/** The same count from attempts already in hand, such as a coffee's history. */
export function cupsByBagFrom(
  attempts: { coffee_bag_id: string | null; cup_count: number | null; moka_cup_size: number | null }[],
  bagIds: string[],
): Map<string, number> {
  const grouped = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    if (!attempt.coffee_bag_id) continue;
    const list = grouped.get(attempt.coffee_bag_id) ?? [];
    list.push(attempt);
    grouped.set(attempt.coffee_bag_id, list);
  }
  const byBag = new Map<string, number>();
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
  // The bags come embedded in the same request. No cover photos: the shelf
  // draws every bag itself, so signing them was work nothing displayed.
  let query = supabase
    .from("coffees")
    .select("*, bags:coffee_bags(id, status, roast_date)")
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

  let items: CoffeeListItem[] = coffees;

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

/**
 * One signed cover URL per coffee, picked by pickCoverPhoto: the
 * "package_front" shot on the given bag, else the newest one on any other
 * bag of the same coffee. `bags` must hold every bag of each coffee, not
 * just the target ones, or the fallback has nothing to fall back to.
 */
export async function listCoverUrlsByCoffee(
  supabase: Client,
  bags: { id: string; coffee_id: string }[],
  targetBagIdByCoffee: Map<string, string>,
): Promise<Map<string, string>> {
  const coverUrlByCoffee = new Map<string, string>();
  if (!bags.length) return coverUrlByCoffee;

  const { data: fronts, error } = await supabase
    .from("coffee_media")
    .select("coffee_bag_id, storage_path, has_thumbnail, created_at")
    .in(
      "coffee_bag_id",
      bags.map((b) => b.id),
    )
    .eq("kind", "package_front");
  if (error) throw error;

  const coffeeIdByBag = new Map(bags.map((b) => [b.id, b.coffee_id]));
  const frontsByCoffee = new Map<string, NonNullable<typeof fronts>>();
  for (const front of fronts ?? []) {
    const coffeeId = coffeeIdByBag.get(front.coffee_bag_id);
    if (!coffeeId) continue;
    const list = frontsByCoffee.get(coffeeId) ?? [];
    list.push(front);
    frontsByCoffee.set(coffeeId, list);
  }

  const picked: { coffeeId: string; storage_path: string; has_thumbnail: boolean }[] = [];
  for (const [coffeeId, coffeeFronts] of frontsByCoffee) {
    const cover = pickCoverPhoto(coffeeFronts, targetBagIdByCoffee.get(coffeeId));
    if (cover) picked.push({ coffeeId, storage_path: cover.storage_path, has_thumbnail: cover.has_thumbnail });
  }

  for (const item of await attachSignedUrls(supabase, picked)) {
    if (item.url) coverUrlByCoffee.set(item.coffeeId, item.url);
  }
  return coverUrlByCoffee;
}

export async function getCoffeeWithBags(supabase: Client, coffeeId: string, userId: string) {
  // Side by side: the bags only need the id, so there's nothing to wait for
  // the coffee row for.
  const [{ data: coffee, error }, { data: bags, error: bagsError }] = await Promise.all([
    supabase.from("coffees").select("*").eq("id", coffeeId).eq("user_id", userId).maybeSingle(),
    supabase
      .from("coffee_bags")
      .select("*")
      .eq("coffee_id", coffeeId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  if (!coffee) return null;
  if (bagsError) throw bagsError;

  return { coffee, bags: bags ?? [] };
}

// The coffee detail page shows every bag's full panel inline (dates,
// inventory, photos) instead of linking out to a separate page per bag, so
// it needs each bag's media up front, grouped by bag id.
// Filtered through each photo's bag rather than by a list of bag ids, so it
// can go out alongside the bags instead of after them.
export async function listMediaForCoffee(supabase: Client, coffeeId: string) {
  const { data, error } = await supabase
    .from("coffee_media")
    .select("*, coffee_bags!inner()")
    .eq("coffee_bags.coffee_id", coffeeId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const mediaWithUrls = await attachSignedUrls(supabase, data ?? []);

  const byBag = new Map<string, (CoffeeMediaRow & { url: string | null })[]>();
  for (const item of mediaWithUrls) {
    const list = byBag.get(item.coffee_bag_id) ?? [];
    list.push(item);
    byBag.set(item.coffee_bag_id, list);
  }
  return byBag;
}

export async function getBagDetail(supabase: Client, bagId: string) {
  // The bag and its own photos only need the bag id, so they go out together.
  const [{ data: bag, error }, { data: media, error: mediaError }] = await Promise.all([
    supabase.from("coffee_bags").select("*, coffee:coffees(id, name, roaster)").eq("id", bagId).maybeSingle(),
    supabase.from("coffee_media").select("*").eq("coffee_bag_id", bagId).order("created_at", { ascending: true }),
  ]);
  if (error) throw error;
  if (!bag) return null;
  if (mediaError) throw mediaError;

  // A bag without a front photo of its own borrows the coffee's (see
  // pickCoverPhoto), which needs the coffee id the bag row just gave us.
  const borrowed = (media ?? []).some((m) => m.kind === "package_front")
    ? undefined
    : await getSiblingCover(supabase, bag.coffee_id, bagId);

  // One signing call for the bag's photos and the borrowed cover.
  const signed = await attachSignedUrls(supabase, borrowed ? [...(media ?? []), borrowed] : (media ?? []));
  const sharedCover = borrowed ? signed.pop() : undefined;

  return {
    bag,
    media: signed,
    sharedPhoto: sharedCover?.url ? { url: sharedCover.url, alt: sharedCover.alt_text } : null,
  };
}

export type SharedCoverPhoto = { url: string; alt: string | null };

/**
 * The coffee's front photo borrowed from another of its bags, for a bag that
 * has no front photo of its own (see pickCoverPhoto). Null when the bag has
 * its own, or when no bag of the coffee has one.
 */
export function sharedCoverFromMedia(
  bagId: string,
  allMedia: (CoffeeMediaRow & { url: string | null })[],
): SharedCoverPhoto | null {
  const fronts = allMedia.filter((m) => m.kind === "package_front" && m.url);
  const cover = pickCoverPhoto(fronts, bagId);
  if (!cover?.url || cover.coffee_bag_id === bagId) return null;
  return { url: cover.url, alt: cover.alt_text };
}

/** The other bags' front photo this bag would borrow, unsigned. */
async function getSiblingCover(
  supabase: Client,
  coffeeId: string,
  bagId: string,
): Promise<CoffeeMediaRow | undefined> {
  const { data: fronts, error } = await supabase
    .from("coffee_media")
    .select("*, coffee_bags!inner()")
    .eq("coffee_bags.coffee_id", coffeeId)
    .neq("coffee_bag_id", bagId)
    .eq("kind", "package_front");
  if (error) throw error;
  return pickCoverPhoto(fronts ?? [], bagId);
}
