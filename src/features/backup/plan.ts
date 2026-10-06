// Turning an export file (/api/export?format=json) back into rows. Pure:
// what's already in the account comes in as `existing`, so the whole
// decision — what's new, what's already there, what can't be brought back —
// can be tested without a database. importBackup.ts next to it does the I/O.

import { z } from "zod";
import type { Database } from "@/types/database";

type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type CoffeeInsert = Insert<"coffees">;
export type BagInsert = Insert<"coffee_bags">;
export type AttemptInsert = Insert<"brew_attempts">;

// Lenient on purpose: any 8-4-4-4-12 hex id, not only RFC version 4 —
// it's whatever Postgres generated, and that's all it needs to be.
const id = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

// Only what the import itself relies on is checked here. Every other column
// is copied as-is and the database's own constraints judge it, so this
// can't drift from them.
export const backupSchema = z.looseObject({
  coffees: z.array(z.looseObject({ id, name: z.string().min(1), roaster: z.string() })),
  coffee_bags: z.array(z.looseObject({ id, coffee_id: id })),
  brew_attempts: z.array(z.looseObject({ id, coffee_id: id, coffee_bag_id: id })),
});
export type Backup = z.infer<typeof backupSchema>;

// The columns that are copied, per table. Anything else in the file — a
// column an older version had and a migration dropped, user_id, the derived
// preferred_attempt_id — is left out. Typed against the generated schema,
// so a renamed column fails the build instead of the import.
const COFFEE_COLUMNS = [
  "id", "name", "roaster", "country", "region", "farm", "producer", "process", "roast_level",
  "varieties", "tasting_notes", "altitude_min_m", "altitude_max_m", "archived_at", "created_at", "updated_at",
] as const satisfies readonly (keyof CoffeeInsert)[];

const BAG_COLUMNS = [
  "id", "coffee_id", "status", "inventory_mode", "lot_label", "roast_date", "purchase_date", "opened_at",
  "first_brew_at", "finished_at", "package_weight_g", "remaining_g", "estimated_dose_g", "created_at", "updated_at",
] as const satisfies readonly (keyof BagInsert)[];

const ATTEMPT_COLUMNS = [
  "id", "coffee_id", "coffee_bag_id", "attempt_no", "method", "parent_attempt_id", "recipe_source_attempt_id",
  "idempotency_key", "equipment_id", "grinder_id", "equipment_snapshot", "hidden_from_dashboard", "favourite_at",
  "dose_g", "water_g", "dilution_water_g", "target_weight_g", "output_weight_g", "input_weight_g", "temperature_c",
  "temperature_offset_c", "target_time_ms", "extraction_ms", "grind_setting", "grind_seconds", "grinder_upper_burr",
  "grinder_lower_burr", "moka_cup_size", "cup_count", "heat_intensity", "basket_type", "basket_size", "dose_mode",
  "dose_feedback", "shot_mode", "acidity", "sweetness", "bitterness", "body", "intensity", "balance",
  "overall_rating", "tds_percent", "would_brew_again", "notes", "created_at", "updated_at",
] as const satisfies readonly (keyof AttemptInsert)[];

function pick<T>(row: Record<string, unknown>, columns: readonly string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const column of columns) {
    if (row[column] !== undefined) out[column] = row[column];
  }
  return out as Partial<T>;
}

/** What the account already has, as far as this file is concerned. */
export type Existing = {
  coffeeIds: Set<string>;
  bagIds: Set<string>;
  attemptIds: Set<string>;
  /** Idempotency keys of the account's attempts: the same brew, saved twice. */
  attemptKeys: Set<string>;
  equipmentIds: Set<string>;
  grinderIds: Set<string>;
  /** Attempt numbers already taken, per coffee — they're unique per coffee. */
  attemptNosByCoffee: Map<string, Set<number>>;
  /** Other people's attempts the account can still see: recipe sources. */
  visibleAttemptIds: Set<string>;
};

export type ImportCounts = {
  coffees: { added: number; existing: number };
  bags: { added: number; existing: number; skipped: number };
  attempts: { added: number; existing: number; skipped: number };
};

export type ImportPlan = {
  coffees: CoffeeInsert[];
  bags: BagInsert[];
  attempts: AttemptInsert[];
  counts: ImportCounts;
};

export function planImport(backup: Backup, userId: string, existing: Existing): ImportPlan {
  const counts: ImportCounts = {
    coffees: { added: 0, existing: 0 },
    bags: { added: 0, existing: 0, skipped: 0 },
    attempts: { added: 0, existing: 0, skipped: 0 },
  };

  const coffees: CoffeeInsert[] = [];
  for (const row of backup.coffees) {
    if (existing.coffeeIds.has(row.id)) {
      counts.coffees.existing++;
      continue;
    }
    // preferred_attempt_id is derived from the attempts' favourite_at by a
    // trigger; setting it here would only be overwritten (or rejected,
    // before its attempt exists).
    coffees.push({ ...pick<CoffeeInsert>(row, COFFEE_COLUMNS), user_id: userId } as CoffeeInsert);
    counts.coffees.added++;
  }
  const coffeeIds = new Set([...existing.coffeeIds, ...coffees.map((c) => c.id!)]);

  const bags: BagInsert[] = [];
  for (const row of backup.coffee_bags) {
    if (existing.bagIds.has(row.id)) {
      counts.bags.existing++;
    } else if (!coffeeIds.has(row.coffee_id)) {
      // Its coffee is neither in the file nor in the account.
      counts.bags.skipped++;
    } else {
      bags.push({ ...pick<BagInsert>(row, BAG_COLUMNS), user_id: userId } as BagInsert);
      counts.bags.added++;
    }
  }
  const bagIds = new Set([...existing.bagIds, ...bags.map((b) => b.id!)]);

  // Exports from before favourites could be many per coffee only have the
  // coffee's single preferred_attempt_id. Bring that one back as a
  // favourite, dated like the migration that replaced it did.
  const legacyFavourites = new Set(
    backup.coffees
      .map((c) => c.preferred_attempt_id)
      .filter((v): v is string => typeof v === "string"),
  );

  const usedNos = new Map<string, Set<number>>();
  const usedFor = (coffeeId: string) => {
    let set = usedNos.get(coffeeId);
    if (!set) {
      set = new Set(existing.attemptNosByCoffee.get(coffeeId) ?? []);
      usedNos.set(coffeeId, set);
    }
    return set;
  };

  const incoming = backup.brew_attempts.filter((row) => {
    const key = typeof row.idempotency_key === "string" ? row.idempotency_key : null;
    if (existing.attemptIds.has(row.id) || (key && existing.attemptKeys.has(key))) {
      counts.attempts.existing++;
      return false;
    }
    if (!coffeeIds.has(row.coffee_id) || !bagIds.has(row.coffee_bag_id)) {
      counts.attempts.skipped++;
      return false;
    }
    return true;
  });
  const newAttemptIds = new Set(incoming.map((row) => row.id));
  const ownAttemptIds = new Set([...existing.attemptIds, ...newAttemptIds]);

  // In their original order, so a number that has to move goes after the
  // ones that didn't.
  const sorted = [...incoming].sort(
    (a, b) => Number(a.attempt_no ?? Infinity) - Number(b.attempt_no ?? Infinity),
  );
  const attempts: AttemptInsert[] = [];
  for (const row of sorted) {
    const attempt = { ...pick<AttemptInsert>(row, ATTEMPT_COLUMNS), user_id: userId } as AttemptInsert;

    const taken = usedFor(attempt.coffee_id);
    const wanted = typeof attempt.attempt_no === "number" ? attempt.attempt_no : null;
    attempt.attempt_no = wanted !== null && !taken.has(wanted) ? wanted : Math.max(0, ...taken) + 1;
    taken.add(attempt.attempt_no);

    // References the account can't satisfy are dropped rather than failing
    // the whole import: the equipment isn't in an export at all, and a
    // parent or recipe source may be gone.
    if (attempt.equipment_id && !existing.equipmentIds.has(attempt.equipment_id)) attempt.equipment_id = null;
    if (attempt.grinder_id && !existing.grinderIds.has(attempt.grinder_id)) attempt.grinder_id = null;
    if (attempt.parent_attempt_id && !ownAttemptIds.has(attempt.parent_attempt_id)) attempt.parent_attempt_id = null;
    if (
      attempt.recipe_source_attempt_id &&
      !ownAttemptIds.has(attempt.recipe_source_attempt_id) &&
      !existing.visibleAttemptIds.has(attempt.recipe_source_attempt_id)
    ) {
      attempt.recipe_source_attempt_id = null;
    }
    if (!attempt.favourite_at && legacyFavourites.has(row.id)) {
      attempt.favourite_at = attempt.created_at ?? new Date().toISOString();
    }

    attempts.push(attempt);
    counts.attempts.added++;
  }

  return { coffees, bags, attempts, counts };
}

/**
 * Points every reference at a row's new id. Used when an id from the file
 * already belongs to another account — importing into a second account
 * while the first one still exists — and the row has to be copied under a
 * fresh id instead.
 */
export function remapReferences(plan: Pick<ImportPlan, "bags" | "attempts">, ids: Map<string, string>) {
  const to = (value: string | null | undefined) => (value && ids.get(value)) ?? value;
  for (const bag of plan.bags) bag.coffee_id = to(bag.coffee_id)!;
  for (const attempt of plan.attempts) {
    attempt.coffee_id = to(attempt.coffee_id)!;
    attempt.coffee_bag_id = to(attempt.coffee_bag_id)!;
    attempt.parent_attempt_id = to(attempt.parent_attempt_id);
    attempt.recipe_source_attempt_id = to(attempt.recipe_source_attempt_id);
  }
}
