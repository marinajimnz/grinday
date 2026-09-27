// F3: search_profiles() finds public profiles by name or @username, and
// only the ones the profile page itself would show.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, errorCode, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

const SEARCH_RESULT_FIELDS = ["account_type", "display_name", "username"];

// Unique per run so the live database's real accounts never match.
const tag = () => `zq${Math.random().toString(36).slice(2, 8)}`;

async function profile(
  tx: TransactionSql,
  username: string,
  displayName: string,
  visibility: "public" | "private" | "unset" = "public",
) {
  const user = await createUser(tx, { display_name: displayName });
  await tx`update public.profiles set username = ${username} where id = ${user.id}`;
  if (visibility !== "unset") {
    await tx`update public.profiles set visibility = ${visibility} where id = ${user.id}`;
  }
  return user;
}

async function search(tx: TransactionSql, viewer: TestUser, query: string, kind = "all") {
  await asUser(tx, viewer);
  const rows = await tx`select * from public.search_profiles(${query}, ${kind})`;
  await asService(tx);
  return rows;
}

describe("search_profiles", () => {
  it("finds public profiles by username or name, accents and case aside, with only the allowlisted fields", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const t = tag();
      await profile(tx, `${t}_lucia`, `Lucía ${t}`);
      const viewer = await createUser(tx);

      const byUsername = await search(tx, viewer, `@${t}_LUC`);
      expect(byUsername.map((r) => r.username)).toEqual([`${t}_lucia`]);
      expect(Object.keys(byUsername[0]).sort()).toEqual(SEARCH_RESULT_FIELDS);

      const byName = await search(tx, viewer, `lucia ${t}`);
      expect(byName.map((r) => r.username)).toEqual([`${t}_lucia`]);
    });
  });

  it("never returns private, unanswered or suspended profiles, nor the viewer", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const t = tag();
      await profile(tx, `${t}_publica`, "Pública");
      await profile(tx, `${t}_privada`, "Privada", "private");
      await profile(tx, `${t}_sinelegir`, "Sin elegir", "unset");
      const suspended = await profile(tx, `${t}_suspendida`, "Suspendida");
      await tx`update public.profiles set moderation_status = 'suspended' where id = ${suspended.id}`;
      const viewer = await profile(tx, `${t}_yo`, "Yo");

      const rows = await search(tx, viewer, t);
      expect(rows.map((r) => r.username)).toEqual([`${t}_publica`]);
    });
  });

  it("needs at least two characters and returns at most 20", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const t = tag();
      for (let i = 0; i < 22; i++) {
        await profile(tx, `${t}_${String(i).padStart(2, "0")}`, `Cuenta ${i}`);
      }
      const viewer = await createUser(tx);
      expect(await search(tx, viewer, "z")).toHaveLength(0);
      expect(await search(tx, viewer, " @ ")).toHaveLength(0);
      expect(await search(tx, viewer, t)).toHaveLength(20);
    });
  });

  it("treats % and _ as plain characters", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const t = tag();
      await profile(tx, `${t}_ab`, "Con guion bajo");
      await profile(tx, `${t}xab`, "Sin guion bajo");
      const viewer = await createUser(tx);
      expect((await search(tx, viewer, `${t}_ab`)).map((r) => r.username)).toEqual([`${t}_ab`]);
      expect(await search(tx, viewer, "%%")).toHaveLength(0);
    });
  });

  it("puts an exact username first, then usernames that start with the query", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const t = tag();
      await profile(tx, `a_${t}`, "Contiene");
      await profile(tx, `${t}_mas`, "Empieza");
      await profile(tx, t, "Exacto");
      const viewer = await createUser(tx);
      expect((await search(tx, viewer, t)).map((r) => r.username)).toEqual([t, `${t}_mas`, `a_${t}`]);
    });
  });

  it("follows the kill switch and filters by kind", async () => {
    await withRollback(async (tx) => {
      const t = tag();
      await profile(tx, `${t}_lucia`, "Lucía");
      const regular = await createUser(tx);
      const admin = await createUser(tx, { role: "admin" });

      await tx`update public.app_settings set social_enabled = 'off'`;
      expect(await search(tx, admin, t)).toHaveLength(0);
      await tx`update public.app_settings set social_enabled = 'admins'`;
      expect(await search(tx, admin, t)).toHaveLength(1);
      expect(await search(tx, regular, t)).toHaveLength(0);

      expect(await search(tx, admin, t, "person")).toHaveLength(1);
      expect(await search(tx, admin, t, "roaster")).toHaveLength(0);
      await asUser(tx, admin);
      expect(await errorCode(tx, (sp) => sp`select * from public.search_profiles(${t}, 'otra')`)).toBe("22023");
    });
  });

  it("can't be called without a session", async () => {
    await withRollback(async (tx) => {
      await tx`set local role anon`;
      expect(await errorCode(tx, (sp) => sp`select * from public.search_profiles('lucia')`)).toBe("42501");
    });
  });
});
