// F7: an attempt brewed from someone's public recipe credits them only
// while their profile and that recipe are still public, and only its own
// owner can ask where it came from.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

const usernameFor = (id: string) => `t_${id.replace(/-/g, "").slice(0, 12)}`;

async function brewer(tx: TransactionSql) {
  const user = await createUser(tx);
  const username = usernameFor(user.id);
  await tx`update public.profiles set username = ${username}, visibility = 'public' where id = ${user.id}`;
  const [coffee] = await tx`insert into public.coffees (user_id, name, roaster) values (${user.id}, 'Guji', 'La Semilla') returning id`;
  const [bag] = await tx`insert into public.coffee_bags (coffee_id, user_id) values (${coffee.id}, ${user.id}) returning id`;
  return { ...user, username, coffeeId: coffee.id as string, bagId: bag.id as string };
}

async function attempt(tx: TransactionSql, who: Awaited<ReturnType<typeof brewer>>, fields: Record<string, unknown> = {}) {
  const [row] = await tx`
    insert into public.brew_attempts ${tx({ user_id: who.id, coffee_id: who.coffeeId, coffee_bag_id: who.bagId, method: "v60", ...fields })}
    returning id
  `;
  return row.id as string;
}

async function sourceOf(tx: TransactionSql, viewer: TestUser, attemptId: string) {
  await asUser(tx, viewer);
  const rows = await tx`select * from public.get_recipe_source(${attemptId})`;
  await asService(tx);
  return rows;
}

describe("get_recipe_source", () => {
  it("credits the author while their profile and recipe are public, and only then", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await brewer(tx);
      const me = await brewer(tx);
      const source = await attempt(tx, lucia);
      const mine = await attempt(tx, me, { recipe_source_attempt_id: source });

      expect(await sourceOf(tx, me, mine)).toEqual([{ available: true, username: lucia.username, source_attempt_id: source }]);

      await tx`update public.profiles set visibility = 'private' where id = ${lucia.id}`;
      expect(await sourceOf(tx, me, mine)).toEqual([{ available: false, username: null, source_attempt_id: null }]);

      await tx`update public.profiles set visibility = 'public' where id = ${lucia.id}`;
      await tx`update public.brew_attempts set hidden_from_dashboard = true where id = ${source}`;
      expect((await sourceOf(tx, me, mine))[0].available).toBe(false);
    });
  });

  it("answers nothing for an attempt without a source, or someone else's attempt", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await brewer(tx);
      const me = await brewer(tx);
      const source = await attempt(tx, lucia);
      const plain = await attempt(tx, me);
      const mine = await attempt(tx, me, { recipe_source_attempt_id: source });

      expect(await sourceOf(tx, me, plain)).toHaveLength(0);
      expect(await sourceOf(tx, lucia, mine)).toHaveLength(0);
    });
  });

  it("forgets the source when the author deletes it", async () => {
    await withRollback(async (tx) => {
      const lucia = await brewer(tx);
      const me = await brewer(tx);
      const source = await attempt(tx, lucia);
      const mine = await attempt(tx, me, { recipe_source_attempt_id: source });
      await tx`delete from public.brew_attempts where id = ${source}`;
      const [row] = await tx`select recipe_source_attempt_id from public.brew_attempts where id = ${mine}`;
      expect(row.recipe_source_attempt_id).toBeNull();
    });
  });
});
