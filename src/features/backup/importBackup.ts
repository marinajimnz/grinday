import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { planImport, remapReferences, type Backup, type Existing, type ImportCounts } from "./plan";

type Client = SupabaseClient<Database>;

// Ids go in the query string; a few hundred keeps each URL well under the
// limits between here and PostgREST.
const CHUNK = 200;

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))];

// Every lookup is scoped to the account explicitly: coffees and attempts
// also have public-read policies, so RLS alone would let someone else's
// public coffee count as "already yours".
async function findExisting(supabase: Client, userId: string, backup: Backup): Promise<Existing> {
  const ids = async (table: "coffees" | "coffee_bags" | "brew_attempts", values: string[]) => {
    const found = new Set<string>();
    for (const part of chunks(values)) {
      const { data, error } = await supabase.from(table).select("id").eq("user_id", userId).in("id", part);
      if (error) throw error;
      for (const row of data ?? []) found.add(row.id);
    }
    return found;
  };

  const coffeeIds = unique(backup.coffees.map((c) => c.id));
  const attemptIds = unique(backup.brew_attempts.map((a) => a.id));
  const keys = unique(backup.brew_attempts.map((a) => a.idempotency_key as string | undefined));
  const sources = unique(backup.brew_attempts.map((a) => a.recipe_source_attempt_id as string | undefined));
  const touchedCoffees = unique([...coffeeIds, ...backup.brew_attempts.map((a) => a.coffee_id)]);

  const attemptKeys = new Set<string>();
  for (const part of chunks(keys)) {
    const { data, error } = await supabase
      .from("brew_attempts")
      .select("idempotency_key")
      .eq("user_id", userId)
      .in("idempotency_key", part);
    if (error) throw error;
    for (const row of data ?? []) if (row.idempotency_key) attemptKeys.add(row.idempotency_key);
  }

  const attemptNosByCoffee = new Map<string, Set<number>>();
  for (const part of chunks(touchedCoffees)) {
    const { data, error } = await supabase
      .from("brew_attempts")
      .select("coffee_id, attempt_no")
      .eq("user_id", userId)
      .in("coffee_id", part);
    if (error) throw error;
    for (const row of data ?? []) {
      const set = attemptNosByCoffee.get(row.coffee_id) ?? new Set<number>();
      set.add(row.attempt_no);
      attemptNosByCoffee.set(row.coffee_id, set);
    }
  }

  // Not scoped to the account: a recipe source is someone else's public
  // attempt, and RLS is exactly the rule for whether it can still be seen.
  const visibleAttemptIds = new Set<string>();
  for (const part of chunks(sources)) {
    const { data, error } = await supabase.from("brew_attempts").select("id").in("id", part);
    if (error) throw error;
    for (const row of data ?? []) visibleAttemptIds.add(row.id);
  }

  const [equipment, grinders] = await Promise.all([
    supabase.from("user_brew_equipment").select("id").eq("user_id", userId),
    supabase.from("user_grinders").select("id").eq("user_id", userId),
  ]);
  if (equipment.error) throw equipment.error;
  if (grinders.error) throw grinders.error;

  return {
    coffeeIds: await ids("coffees", coffeeIds),
    bagIds: await ids("coffee_bags", unique(backup.coffee_bags.map((b) => b.id))),
    attemptIds: await ids("brew_attempts", attemptIds),
    attemptKeys,
    equipmentIds: new Set((equipment.data ?? []).map((r) => r.id)),
    grinderIds: new Set((grinders.data ?? []).map((r) => r.id)),
    attemptNosByCoffee,
    visibleAttemptIds,
  };
}

// Inserts keeping each row's own id where it's free. "On conflict do
// nothing" skips a row whose id another account already holds (none of this
// account's are in the batch — the plan left them out); those come back
// missing from the result and are inserted again under a fresh id. Keeping
// the id is what makes a second import of the same file find everything
// already there instead of duplicating it.
async function insertKeepingIds(
  supabase: Client,
  table: "coffees" | "coffee_bags" | "brew_attempts",
  rows: { id?: string }[],
): Promise<Map<string, string>> {
  const remapped = new Map<string, string>();
  for (const part of chunks(rows)) {
    const { data, error } = await supabase
      .from(table)
      // Typed per call site; the three tables share this path.
      .upsert(part as never, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    const inserted = new Set((data ?? []).map((r: { id: string }) => r.id));
    for (const row of part) {
      if (!inserted.has(row.id!)) remapped.set(row.id!, crypto.randomUUID());
    }
  }
  return remapped;
}

async function insertRemapped(
  supabase: Client,
  table: "coffees" | "coffee_bags" | "brew_attempts",
  rows: { id?: string }[],
  remapped: Map<string, string>,
) {
  const moved = rows.filter((row) => remapped.has(row.id!));
  for (const row of moved) row.id = remapped.get(row.id!);
  for (const part of chunks(moved)) {
    const { error } = await supabase.from(table).insert(part as never);
    if (error) throw error;
  }
}

/**
 * Brings an export back into the account, adding what's missing and
 * leaving what's already there untouched. With `dryRun` it only reports
 * what it would do.
 *
 * Not one transaction — PostgREST can't span three tables — but every step
 * is safe to repeat: a failure part-way leaves whatever went in, and running
 * the same file again finds it and carries on from there.
 */
export async function importBackup(
  supabase: Client,
  userId: string,
  backup: Backup,
  { dryRun }: { dryRun: boolean },
): Promise<ImportCounts> {
  const plan = planImport(backup, userId, await findExisting(supabase, userId, backup));
  if (dryRun) return plan.counts;

  const coffeeIds = await insertKeepingIds(supabase, "coffees", plan.coffees);
  await insertRemapped(supabase, "coffees", plan.coffees, coffeeIds);
  remapReferences(plan, coffeeIds);

  const bagIds = await insertKeepingIds(supabase, "coffee_bags", plan.bags);
  await insertRemapped(supabase, "coffee_bags", plan.bags, bagIds);
  remapReferences(plan, bagIds);

  // Attempts can point at each other — a parent, or a recipe copied from
  // another attempt in the same file — and a pointer can't be written until
  // it's known whether its target kept its id. So they go in without those
  // links, and the links are written once every id is final.
  const fileAttemptIds = new Set(plan.attempts.map((a) => a.id!));
  const links = new Map<(typeof plan.attempts)[number], { parent: string | null; source: string | null }>();
  for (const attempt of plan.attempts) {
    const parent = attempt.parent_attempt_id ?? null;
    const source = attempt.recipe_source_attempt_id ?? null;
    const sourceInFile = source !== null && fileAttemptIds.has(source);
    if (parent || sourceInFile) {
      links.set(attempt, { parent, source: sourceInFile ? source : null });
      attempt.parent_attempt_id = null;
      if (sourceInFile) attempt.recipe_source_attempt_id = null;
    }
  }
  const attemptIds = await insertKeepingIds(supabase, "brew_attempts", plan.attempts);
  await insertRemapped(supabase, "brew_attempts", plan.attempts, attemptIds);

  const finalId = (value: string | null) => (value && attemptIds.get(value)) ?? value;
  const linked = [...links].map(([attempt, { parent, source }]) => ({
    ...attempt,
    parent_attempt_id: finalId(parent),
    recipe_source_attempt_id: source ? finalId(source) : attempt.recipe_source_attempt_id,
  }));
  for (const part of chunks(linked)) {
    const { error } = await supabase.from("brew_attempts").upsert(part, { onConflict: "id" });
    if (error) throw error;
  }

  return plan.counts;
}
