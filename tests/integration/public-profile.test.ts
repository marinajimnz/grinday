// F2: get_public_profile() is the first thing one account can read of
// another. These pin who gets an answer, and exactly what the answer holds.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, errorCode, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

// Everything the header is allowed to show. A new column here must be a
// decision, made by editing this list.
const PUBLIC_PROFILE_FIELDS = [
  "account_type",
  "attempts_count",
  "bio",
  "coffees_count",
  "display_name",
  "recipes_count",
  "username",
].sort();

const usernameFor = (id: string) => `t_${id.replace(/-/g, "").slice(0, 12)}`;

async function publicUser(tx: TransactionSql, options: { role?: "admin" | "coffee_lover" } = {}) {
  const user = await createUser(tx, { display_name: "Lucía V60", ...options });
  const username = usernameFor(user.id);
  await tx`
    update public.profiles
    set username = ${username}, bio = 'Filtros de fin de semana', visibility = 'public'
    where id = ${user.id}
  `;
  return { ...user, username };
}

async function lookUp(tx: TransactionSql, viewer: TestUser, username: string) {
  await asUser(tx, viewer);
  const rows = await tx`select * from public.get_public_profile(${username})`;
  await asService(tx);
  return rows;
}

async function setSwitch(tx: TransactionSql, value: "off" | "admins" | "all") {
  await tx`update public.app_settings set social_enabled = ${value}`;
}

describe("get_public_profile", () => {
  it("returns only the allowlisted header fields, and no ids", async () => {
    await withRollback(async (tx) => {
      await setSwitch(tx, "all");
      const lucia = await publicUser(tx);
      const viewer = await createUser(tx);
      const [row] = await lookUp(tx, viewer, lucia.username);
      expect(Object.keys(row).sort()).toEqual(PUBLIC_PROFILE_FIELDS);
      expect(row).toMatchObject({
        username: lucia.username,
        display_name: "Lucía V60",
        bio: "Filtros de fin de semana",
        account_type: "person",
      });
    });
  });

  it("follows the kill switch", async () => {
    await withRollback(async (tx) => {
      const lucia = await publicUser(tx);
      const admin = await createUser(tx, { role: "admin" });
      const regular = await createUser(tx);

      await setSwitch(tx, "off");
      expect(await lookUp(tx, admin, lucia.username)).toHaveLength(0);
      expect(await lookUp(tx, regular, lucia.username)).toHaveLength(0);

      await setSwitch(tx, "admins");
      expect(await lookUp(tx, admin, lucia.username)).toHaveLength(1);
      expect(await lookUp(tx, regular, lucia.username)).toHaveLength(0);

      await setSwitch(tx, "all");
      expect(await lookUp(tx, regular, lucia.username)).toHaveLength(1);
    });
  });

  it("answers a private, unanswered, suspended or missing profile exactly the same: no row", async () => {
    await withRollback(async (tx) => {
      await setSwitch(tx, "all");
      const viewer = await createUser(tx);

      const privateOne = await publicUser(tx);
      await tx`update public.profiles set visibility = 'private' where id = ${privateOne.id}`;

      const unanswered = await createUser(tx);
      await tx`update public.profiles set username = ${usernameFor(unanswered.id)} where id = ${unanswered.id}`;

      const suspended = await publicUser(tx);
      await tx`update public.profiles set moderation_status = 'suspended' where id = ${suspended.id}`;

      for (const username of [privateOne.username, usernameFor(unanswered.id), suspended.username, "nadie_se_llama_asi"]) {
        expect(await lookUp(tx, viewer, username), username).toHaveLength(0);
      }
    });
  });

  it("finds the profile whatever the case or spacing typed", async () => {
    await withRollback(async (tx) => {
      await setSwitch(tx, "all");
      const lucia = await publicUser(tx);
      const viewer = await createUser(tx);
      expect(await lookUp(tx, viewer, ` ${lucia.username.toUpperCase()} `)).toHaveLength(1);
    });
  });

  it("counts only coffees that aren't archived, and their attempts", async () => {
    await withRollback(async (tx) => {
      await setSwitch(tx, "all");
      const lucia = await publicUser(tx);
      const viewer = await createUser(tx);

      const [kept] = await tx`
        insert into public.coffees (user_id, name, roaster) values (${lucia.id}, 'Guji', 'La Semilla') returning id
      `;
      const [archived] = await tx`
        insert into public.coffees (user_id, name, roaster, archived_at)
        values (${lucia.id}, 'Viejo', 'Otra', now()) returning id
      `;
      for (const coffee of [kept, archived]) {
        const [bag] = await tx`
          insert into public.coffee_bags (coffee_id, user_id) values (${coffee.id}, ${lucia.id}) returning id
        `;
        await tx`
          insert into public.brew_attempts (user_id, coffee_id, coffee_bag_id)
          values (${lucia.id}, ${coffee.id}, ${bag.id}), (${lucia.id}, ${coffee.id}, ${bag.id})
        `;
      }
      const [first] = await tx`select id from public.brew_attempts where coffee_id = ${kept.id} limit 1`;
      await tx`update public.coffees set preferred_attempt_id = ${first.id} where id = ${kept.id}`;

      const [row] = await lookUp(tx, viewer, lucia.username);
      expect(row).toMatchObject({ coffees_count: 1, recipes_count: 1, attempts_count: 2 });
    });
  });

  it("can't be called without a session, and moderation_status can't be written by its owner", async () => {
    await withRollback(async (tx) => {
      await tx`set local role anon`;
      expect(await errorCode(tx, (sp) => sp`select * from public.get_public_profile('x')`)).toBe("42501");
      await asService(tx);

      const lucia = await publicUser(tx);
      await asUser(tx, lucia, "aal2");
      expect(
        await errorCode(tx, (sp) => sp`update public.profiles set moderation_status = 'active' where id = ${lucia.id}`),
      ).toBe("42501");
    });
  });
});
