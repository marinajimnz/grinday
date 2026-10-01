// 0051 moved the favourite mark off the coffee and onto the attempt, and left
// coffees.preferred_attempt_id behind as a cache that a trigger maintains.
// Eight functions still read that column, so what it holds has to stay right
// through every path that can change it — including the one the foreign key's
// "on delete set null" would otherwise win.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, withRollback } from "./helpers/db";

afterAll(closeDb);

async function brewer(tx: TransactionSql) {
  const user = await createUser(tx);
  const [coffee] = await tx`
    insert into public.coffees (user_id, name, roaster)
    values (${user.id}, 'Guji', 'La Semilla') returning id`;
  const [bag] = await tx`
    insert into public.coffee_bags (coffee_id, user_id) values (${coffee.id}, ${user.id}) returning id`;
  return { ...user, coffeeId: coffee.id as string, bagId: bag.id as string };
}

async function attempt(
  tx: TransactionSql,
  who: Awaited<ReturnType<typeof brewer>>,
  fields: Record<string, unknown> = {},
) {
  const [row] = await tx`
    insert into public.brew_attempts ${tx({
      user_id: who.id,
      coffee_id: who.coffeeId,
      coffee_bag_id: who.bagId,
      method: "v60",
      ...fields,
    })}
    returning id, attempt_no
  `;
  return row as { id: string; attempt_no: number };
}

async function cachedFavourite(tx: TransactionSql, coffeeId: string) {
  const [row] = await tx`select preferred_attempt_id from public.coffees where id = ${coffeeId}`;
  return row.preferred_attempt_id as string | null;
}

async function star(tx: TransactionSql, attemptId: string, at: string | null) {
  await tx`update public.brew_attempts set favourite_at = ${at} where id = ${attemptId}`;
}

describe("favourite recipes", () => {
  it("keeps several favourites for one coffee, and caches the most recently starred", async () => {
    await withRollback(async (tx) => {
      const me = await brewer(tx);
      const first = await attempt(tx, me);
      const second = await attempt(tx, me);

      await star(tx, first.id, "2026-09-01");
      expect(await cachedFavourite(tx, me.coffeeId)).toBe(first.id);

      // The whole point of the change: the second star does not take the
      // first one down.
      await star(tx, second.id, "2026-09-20");
      const [{ count }] = await tx`
        select count(*)::int from public.brew_attempts
        where coffee_id = ${me.coffeeId} and favourite_at is not null`;
      expect(count).toBe(2);
      expect(await cachedFavourite(tx, me.coffeeId)).toBe(second.id);
    });
  });

  it("falls back to the remaining favourite when one is unstarred, and to null when none is left", async () => {
    await withRollback(async (tx) => {
      const me = await brewer(tx);
      const first = await attempt(tx, me);
      const second = await attempt(tx, me);
      await star(tx, first.id, "2026-09-01");
      await star(tx, second.id, "2026-09-20");

      await star(tx, second.id, null);
      expect(await cachedFavourite(tx, me.coffeeId)).toBe(first.id);

      await star(tx, first.id, null);
      expect(await cachedFavourite(tx, me.coffeeId)).toBeNull();
    });
  });

  it("re-points the cache when the cached favourite is deleted, rather than losing it to the foreign key", async () => {
    await withRollback(async (tx) => {
      const me = await brewer(tx);
      const kept = await attempt(tx, me);
      const doomed = await attempt(tx, me);
      await star(tx, kept.id, "2026-09-01");
      await star(tx, doomed.id, "2026-09-20");
      expect(await cachedFavourite(tx, me.coffeeId)).toBe(doomed.id);

      // coffees_preferred_attempt_fk is "on delete set null", and that is
      // itself an after-row action. The recompute is statement level so it
      // runs afterwards and has the last word — a per-row trigger here would
      // race the null and sometimes lose.
      await tx`delete from public.brew_attempts where id = ${doomed.id}`;
      expect(await cachedFavourite(tx, me.coffeeId)).toBe(kept.id);
    });
  });

  it("does not rewrite the coffee row when an attempt changes but its star does not", async () => {
    await withRollback(async (tx) => {
      const me = await brewer(tx);
      const starred = await attempt(tx, me);
      const other = await attempt(tx, me);
      await star(tx, starred.id, "2026-09-01");

      // Why this matters: /brew/new orders the picker by coffees.updated_at,
      // and every write to coffees moves it through coffees_set_updated_at. A
      // recompute that wrote the same value back would reshuffle the picker
      // each time an attempt was corrected or rated. The trigger fires on any
      // update of an attempt — one carrying a column list cannot have a
      // transition table at all — so not writing is what keeps the list still.
      //
      // Measured by ctid, not by updated_at: inside one transaction now() is
      // frozen, so every write would stamp the same timestamp and "it did not
      // change" would hold whether the row was rewritten or not. ctid is the
      // row's physical location, and an update always moves it.
      const rowVersion = async () => {
        const [row] = await tx`select ctid::text from public.coffees where id = ${me.coffeeId}`;
        return row.ctid as string;
      };
      const before = await rowVersion();

      await tx`update public.brew_attempts set overall_rating = 4 where id = ${other.id}`;
      await tx`update public.brew_attempts set grind_setting = 13 where id = ${starred.id}`;
      // Even re-writing favourite_at with the value it already held.
      await star(tx, starred.id, "2026-09-01");
      expect(await rowVersion()).toBe(before);

      // And it is written when the cache genuinely changes.
      await star(tx, other.id, "2026-09-28");
      expect(await rowVersion()).not.toBe(before);
      expect(await cachedFavourite(tx, me.coffeeId)).toBe(other.id);
    });
  });

  it("marks and unmarks a favourite as the owner, through RLS, with no function to call", async () => {
    await withRollback(async (tx) => {
      const me = await brewer(tx);
      const mine = await attempt(tx, me);

      // set_preferred_attempt is gone: starring is a plain update the owner's
      // own RLS policy already allows.
      await asUser(tx, me);
      await tx`update public.brew_attempts set favourite_at = now() where id = ${mine.id}`;
      await asService(tx);
      expect(await cachedFavourite(tx, me.coffeeId)).toBe(mine.id);
    });
  });

  it("does not let one account's star move another account's cache", async () => {
    await withRollback(async (tx) => {
      const me = await brewer(tx);
      const someoneElse = await brewer(tx);
      const theirs = await attempt(tx, someoneElse);

      await asUser(tx, me);
      const updated = await tx`
        update public.brew_attempts set favourite_at = now() where id = ${theirs.id} returning id`;
      await asService(tx);

      expect(updated).toHaveLength(0);
      expect(await cachedFavourite(tx, someoneElse.coffeeId)).toBeNull();
    });
  });
});
