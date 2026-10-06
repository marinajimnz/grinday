import { describe, expect, it } from "vitest";
import { backupSchema, planImport, type Backup, type Existing } from "@/features/backup/plan";

const ME = "00000000-0000-4000-8000-000000000001";
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const C1 = id(1);
const C2 = id(2);
const B1 = id(11);
const B2 = id(12);
const A1 = id(21);
const A2 = id(22);
const A3 = id(23);

function nothingYet(overrides: Partial<Existing> = {}): Existing {
  return {
    coffeeIds: new Set(),
    bagIds: new Set(),
    attemptIds: new Set(),
    attemptKeys: new Set(),
    equipmentIds: new Set(),
    grinderIds: new Set(),
    attemptNosByCoffee: new Map(),
    visibleAttemptIds: new Set(),
    ...overrides,
  };
}

function backup(overrides: Partial<Backup> = {}): Backup {
  return {
    coffees: [{ id: C1, name: "La Esperanza", roaster: "Nomad", user_id: "someone-else", preferred_attempt_id: null }],
    coffee_bags: [{ id: B1, coffee_id: C1, roast_date: "2026-09-24", user_id: "someone-else" }],
    brew_attempts: [
      { id: A1, coffee_id: C1, coffee_bag_id: B1, attempt_no: 1, method: "espresso", created_at: "2026-10-01T09:00:00Z" },
      { id: A2, coffee_id: C1, coffee_bag_id: B1, attempt_no: 2, method: "espresso", parent_attempt_id: A1 },
    ],
    ...overrides,
  };
}

describe("backupSchema", () => {
  it("accepts what /api/export writes", () => {
    const file = { exported_at: "2026-10-06T10:00:00Z", favourites: [], ...backup() };
    expect(backupSchema.safeParse(file).success).toBe(true);
  });

  it("rejects anything that isn't one", () => {
    expect(backupSchema.safeParse({ coffees: [] }).success).toBe(false);
    expect(backupSchema.safeParse([1, 2, 3]).success).toBe(false);
    expect(
      backupSchema.safeParse({ ...backup(), coffees: [{ id: "not-an-id", name: "x", roaster: "y" }] }).success,
    ).toBe(false);
  });
});

describe("planImport", () => {
  it("adds everything to an empty account, as this account's rows", () => {
    const plan = planImport(backup(), ME, nothingYet());

    expect(plan.counts).toEqual({
      coffees: { added: 1, existing: 0 },
      bags: { added: 1, existing: 0, skipped: 0 },
      attempts: { added: 2, existing: 0, skipped: 0 },
    });
    expect(plan.coffees[0].user_id).toBe(ME);
    expect(plan.bags[0].user_id).toBe(ME);
    expect(plan.attempts.every((a) => a.user_id === ME)).toBe(true);
    expect(plan.attempts[1].parent_attempt_id).toBe(A1);
  });

  it("leaves alone what the account already has", () => {
    const plan = planImport(
      backup(),
      ME,
      nothingYet({ coffeeIds: new Set([C1]), bagIds: new Set([B1]), attemptIds: new Set([A1]) }),
    );

    expect(plan.coffees).toHaveLength(0);
    expect(plan.bags).toHaveLength(0);
    expect(plan.attempts.map((a) => a.id)).toEqual([A2]);
    expect(plan.counts.attempts).toEqual({ added: 1, existing: 1, skipped: 0 });
  });

  it("recognises the same brew saved under another id by its idempotency key", () => {
    const file = backup({
      brew_attempts: [{ id: A1, coffee_id: C1, coffee_bag_id: B1, idempotency_key: id(99) }],
    });
    const plan = planImport(file, ME, nothingYet({ attemptKeys: new Set([id(99)]) }));
    expect(plan.counts.attempts.existing).toBe(1);
    expect(plan.attempts).toHaveLength(0);
  });

  it("skips what has no coffee or bag to belong to", () => {
    const file = backup({
      coffee_bags: [{ id: B1, coffee_id: C1 }, { id: B2, coffee_id: C2 }],
      brew_attempts: [{ id: A3, coffee_id: C1, coffee_bag_id: B2 }],
    });
    const plan = planImport(file, ME, nothingYet());
    expect(plan.counts.bags).toEqual({ added: 1, existing: 0, skipped: 1 });
    expect(plan.counts.attempts).toEqual({ added: 0, existing: 0, skipped: 1 });
  });

  it("copies only today's columns, dropping ones a migration removed", () => {
    const file = backup({
      brew_attempts: [{ id: A1, coffee_id: C1, coffee_bag_id: B1, machine_id: id(50), upper_burr_setting: 3, dose_g: 18 }],
    });
    const [attempt] = planImport(file, ME, nothingYet()).attempts;
    expect(attempt).not.toHaveProperty("machine_id");
    expect(attempt).not.toHaveProperty("upper_burr_setting");
    expect(attempt.dose_g).toBe(18);
  });

  it("never sets the derived preferred attempt directly", () => {
    const file = backup({ coffees: [{ id: C1, name: "x", roaster: "y", preferred_attempt_id: A1 }] });
    expect(planImport(file, ME, nothingYet()).coffees[0]).not.toHaveProperty("preferred_attempt_id");
  });

  it("turns an old export's preferred attempt into a favourite", () => {
    const file = backup({ coffees: [{ id: C1, name: "x", roaster: "y", preferred_attempt_id: A1 }] });
    const plan = planImport(file, ME, nothingYet());
    expect(plan.attempts.find((a) => a.id === A1)?.favourite_at).toBe("2026-10-01T09:00:00Z");
    expect(plan.attempts.find((a) => a.id === A2)?.favourite_at).toBeUndefined();
  });

  it("moves an attempt number that's taken in that coffee to the end", () => {
    const plan = planImport(backup(), ME, nothingYet({ coffeeIds: new Set([C1]), attemptNosByCoffee: new Map([[C1, new Set([1, 5])]]) }));
    expect(plan.attempts.map((a) => [a.id, a.attempt_no])).toEqual([
      [A1, 6],
      [A2, 2],
    ]);
  });

  it("drops references the account can't satisfy instead of failing", () => {
    const file = backup({
      brew_attempts: [
        {
          id: A1,
          coffee_id: C1,
          coffee_bag_id: B1,
          equipment_id: id(60),
          grinder_id: id(61),
          parent_attempt_id: id(62),
          recipe_source_attempt_id: id(63),
        },
      ],
    });
    const [attempt] = planImport(file, ME, nothingYet()).attempts;
    expect(attempt).toMatchObject({
      equipment_id: null,
      grinder_id: null,
      parent_attempt_id: null,
      recipe_source_attempt_id: null,
    });
  });

  it("keeps references the account can satisfy", () => {
    const file = backup({
      brew_attempts: [
        { id: A1, coffee_id: C1, coffee_bag_id: B1, equipment_id: id(60), grinder_id: id(61), recipe_source_attempt_id: id(63) },
      ],
    });
    const [attempt] = planImport(
      file,
      ME,
      nothingYet({ equipmentIds: new Set([id(60)]), grinderIds: new Set([id(61)]), visibleAttemptIds: new Set([id(63)]) }),
    ).attempts;
    expect(attempt).toMatchObject({ equipment_id: id(60), grinder_id: id(61), recipe_source_attempt_id: id(63) });
  });
});
