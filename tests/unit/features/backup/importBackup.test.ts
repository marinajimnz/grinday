import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { importBackup } from "@/features/backup/importBackup";
import type { Backup } from "@/features/backup/plan";

vi.mock("server-only", () => ({}));

type Row = Record<string, unknown> & { id: string };

// Just enough of Postgres + PostgREST + RLS to exercise the import: rows are
// visible when they're yours (or marked public), inserts must be yours,
// ids are unique across accounts, foreign keys are checked at the end of
// each statement, and so are the two per-account unique rules.
class FakeDb {
  tables: Record<string, Row[]> = {
    coffees: [],
    coffee_bags: [],
    brew_attempts: [],
    user_brew_equipment: [],
    user_grinders: [],
  };

  constructor(public me: string) {}

  visible(table: string) {
    return this.tables[table].filter((r) => r.user_id === this.me || r.public === true);
  }

  write(table: string, rows: Row[], mode: "insert" | "ignore" | "merge"): Row[] {
    const all = this.tables[table];
    const written: Row[] = [];
    const next = [...all];
    for (const row of rows) {
      if (row.user_id !== this.me) throw new Error("new row violates row-level security policy");
      const at = next.findIndex((r) => r.id === row.id);
      if (at !== -1) {
        if (mode === "ignore") continue;
        if (mode === "insert") throw new Error(`duplicate key ${table}.id`);
        if (next[at].user_id !== this.me) throw new Error("new row violates row-level security policy");
        next[at] = { ...next[at], ...row };
      } else {
        next.push({ ...row });
      }
      written.push(row);
    }
    this.check(table, next);
    this.tables[table] = next;
    return written;
  }

  check(table: string, rows: Row[]) {
    const exists = (t: string, id: unknown) =>
      (t === table ? rows : this.tables[t]).some((r) => r.id === id);
    for (const r of rows) {
      if (table === "coffee_bags" && !exists("coffees", r.coffee_id)) throw new Error("fk coffee_bags.coffee_id");
      if (table === "brew_attempts") {
        if (!exists("coffees", r.coffee_id)) throw new Error("fk brew_attempts.coffee_id");
        if (!exists("coffee_bags", r.coffee_bag_id)) throw new Error("fk brew_attempts.coffee_bag_id");
        for (const col of ["parent_attempt_id", "recipe_source_attempt_id"]) {
          if (r[col] && !exists("brew_attempts", r[col])) throw new Error(`fk brew_attempts.${col}`);
        }
      }
    }
    if (table === "brew_attempts") {
      const nos = rows.map((r) => `${r.coffee_id}#${r.attempt_no}`);
      if (new Set(nos).size !== nos.length) throw new Error("duplicate (coffee_id, attempt_no)");
      const keys = rows.filter((r) => r.idempotency_key).map((r) => `${r.user_id}#${r.idempotency_key}`);
      if (new Set(keys).size !== keys.length) throw new Error("duplicate (user_id, idempotency_key)");
    }
  }
}

function clientFor(db: FakeDb): SupabaseClient<Database> {
  return {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let write: { rows: Row[]; mode: "insert" | "ignore" | "merge" } | null = null;
      const builder = {
        select: () => builder,
        eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), builder),
        in: (col: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[col])), builder),
        insert: (rows: Row[]) => ((write = { rows, mode: "insert" }), builder),
        upsert: (rows: Row[], opts: { ignoreDuplicates?: boolean }) => (
          (write = { rows, mode: opts.ignoreDuplicates ? "ignore" : "merge" }), builder
        ),
        then(resolve: (r: { data: unknown; error: unknown }) => void) {
          try {
            const data = write
              ? db.write(table, write.rows, write.mode).map((r) => ({ id: r.id }))
              : db.visible(table).filter((r) => filters.every((f) => f(r)));
            resolve({ data, error: null });
          } catch (error) {
            resolve({ data: null, error });
          }
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
}

const OLD = "00000000-0000-4000-8000-00000000000a";
const ME = "00000000-0000-4000-8000-00000000000b";
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function exportOf(db: FakeDb): Backup {
  const mine = (t: string) => db.tables[t].filter((r) => r.user_id === db.me);
  return {
    coffees: mine("coffees"),
    coffee_bags: mine("coffee_bags"),
    brew_attempts: mine("brew_attempts"),
  } as unknown as Backup;
}

// One coffee, one bag, a first attempt and a second "duplicated and
// adjusted" from it, the second marked favourite.
function journal(owner: string) {
  const db = new FakeDb(owner);
  db.tables.coffees.push({ id: id(1), user_id: owner, name: "La Esperanza", roaster: "Nomad" });
  db.tables.coffee_bags.push({ id: id(2), user_id: owner, coffee_id: id(1), roast_date: "2026-09-24" });
  db.tables.brew_attempts.push(
    { id: id(3), user_id: owner, coffee_id: id(1), coffee_bag_id: id(2), attempt_no: 1, idempotency_key: id(30) },
    {
      id: id(4),
      user_id: owner,
      coffee_id: id(1),
      coffee_bag_id: id(2),
      attempt_no: 2,
      parent_attempt_id: id(3),
      favourite_at: "2026-10-02T09:00:00Z",
    },
  );
  return db;
}

describe("importBackup", () => {
  it("restores a journal into an empty account", async () => {
    const file = exportOf(journal(OLD));
    const db = new FakeDb(ME);

    const counts = await importBackup(clientFor(db), ME, file, { dryRun: false });

    expect(counts.attempts.added).toBe(2);
    expect(db.tables.coffees).toHaveLength(1);
    expect(db.tables.brew_attempts.every((a) => a.user_id === ME)).toBe(true);
    const second = db.tables.brew_attempts.find((a) => a.attempt_no === 2)!;
    expect(second.parent_attempt_id).toBe(id(3));
    expect(second.favourite_at).toBe("2026-10-02T09:00:00Z");
  });

  it("writes nothing on a dry run", async () => {
    const db = new FakeDb(ME);
    const counts = await importBackup(clientFor(db), ME, exportOf(journal(OLD)), { dryRun: true });
    expect(counts.coffees.added).toBe(1);
    expect(db.tables.coffees).toHaveLength(0);
  });

  it("adds nothing the second time the same file comes in", async () => {
    const file = exportOf(journal(OLD));
    const db = new FakeDb(ME);
    await importBackup(clientFor(db), ME, file, { dryRun: false });

    const again = await importBackup(clientFor(db), ME, file, { dryRun: false });

    expect(again).toEqual({
      coffees: { added: 0, existing: 1 },
      bags: { added: 0, existing: 1, skipped: 0 },
      attempts: { added: 0, existing: 2, skipped: 0 },
    });
    expect(db.tables.brew_attempts).toHaveLength(2);
  });

  it("restores into the same account after things were deleted", async () => {
    const db = journal(ME);
    const file = exportOf(db);
    db.tables.brew_attempts = db.tables.brew_attempts.filter((a) => a.id !== id(4));

    const counts = await importBackup(clientFor(db), ME, file, { dryRun: false });

    expect(counts.attempts).toEqual({ added: 1, existing: 1, skipped: 0 });
    expect(db.tables.brew_attempts.map((a) => a.id).sort()).toEqual([id(3), id(4)]);
  });

  it("copies into a second account while the first still has those ids", async () => {
    // The old account is still there, so every id in the file is taken —
    // by rows this account can't even see.
    const db = journal(OLD);
    const file = exportOf(db);
    db.me = ME;

    const counts = await importBackup(clientFor(db), ME, file, { dryRun: false });

    expect(counts.attempts.added).toBe(2);
    const mine = (t: string) => db.tables[t].filter((r) => r.user_id === ME);
    const [coffee] = mine("coffees");
    const [bag] = mine("coffee_bags");
    const attempts = mine("brew_attempts");
    expect(coffee.id).not.toBe(id(1));
    expect(bag.coffee_id).toBe(coffee.id);
    expect(attempts.every((a) => a.coffee_id === coffee.id && a.coffee_bag_id === bag.id)).toBe(true);
    // The duplicated attempt points at this account's copy of its parent,
    // not at the old account's original.
    const first = attempts.find((a) => a.attempt_no === 1)!;
    const second = attempts.find((a) => a.attempt_no === 2)!;
    expect(second.parent_attempt_id).toBe(first.id);
    expect(first.id).not.toBe(id(3));
    // And the old account is exactly as it was.
    expect(db.tables.brew_attempts.filter((a) => a.user_id === OLD)).toHaveLength(2);
  });
});
