// F6b: an approved roaster shows as a roaster in the header, search and
// favourites, and the search filters split people from roasters.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

const tag = () => `zq${Math.random().toString(36).slice(2, 8)}`;

async function account(tx: TransactionSql, username: string, role: "coffee_lover" | "roaster") {
  const user = await createUser(tx);
  await tx`update public.profiles set username = ${username}, visibility = 'public', role = ${role} where id = ${user.id}`;
  return user;
}

async function as<T>(tx: TransactionSql, user: TestUser, fn: () => Promise<T>): Promise<T> {
  await asUser(tx, user);
  try {
    return await fn();
  } finally {
    await asService(tx);
  }
}

describe("roasters on the public side", () => {
  it("reports the kind of account everywhere and filters search by it", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const t = tag();
      await account(tx, `${t}_semilla`, "roaster");
      await account(tx, `${t}_lucia`, "coffee_lover");
      const viewer = await createUser(tx);

      await as(tx, viewer, async () => {
        const [header] = await tx`select account_type from public.get_public_profile(${`${t}_semilla`})`;
        expect(header.account_type).toBe("roaster");

        const byKind = async (kind: string) =>
          (await tx`select username, account_type from public.search_profiles(${t}, ${kind})`).map(
            (r) => `${r.username}:${r.account_type}`,
          );
        expect(await byKind("all")).toEqual([`${t}_lucia:person`, `${t}_semilla:roaster`]);
        expect(await byKind("roaster")).toEqual([`${t}_semilla:roaster`]);
        expect(await byKind("person")).toEqual([`${t}_lucia:person`]);

        await tx`select public.save_profile(${`${t}_semilla`})`;
        const [favourite] = await tx`select account_type from public.get_my_favourites()`;
        expect(favourite.account_type).toBe("roaster");
      });
    });
  });

  it("a roaster whose role is revoked shows as a person again", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const t = tag();
      const roaster = await account(tx, `${t}_semilla`, "roaster");
      const viewer = await createUser(tx);
      await tx`update public.profiles set role = 'coffee_lover' where id = ${roaster.id}`;
      await as(tx, viewer, async () => {
        const [header] = await tx`select account_type from public.get_public_profile(${`${t}_semilla`})`;
        expect(header.account_type).toBe("person");
      });
    });
  });
});
