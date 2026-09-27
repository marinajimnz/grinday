// F5: favourites are a private list. Only its owner reads or changes it,
// only visible profiles can be saved, and a saved profile that goes
// private stays on the list with nothing about it shown.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, errorCode, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

const FAVOURITE_FIELDS = ["account_type", "available", "bookmark_id", "display_name", "saved_at", "username"];
const usernameFor = (id: string) => `t_${id.replace(/-/g, "").slice(0, 12)}`;
type Named = TestUser & { username: string };

async function named(tx: TransactionSql, visibility: "public" | "private" | "unset" = "public"): Promise<Named> {
  const user = await createUser(tx, { display_name: "Lucía V60" });
  const username = usernameFor(user.id);
  await tx`update public.profiles set username = ${username} where id = ${user.id}`;
  if (visibility !== "unset") {
    await tx`update public.profiles set visibility = ${visibility} where id = ${user.id}`;
  }
  return { ...user, username };
}

async function as<T>(tx: TransactionSql, user: TestUser, fn: () => Promise<T>): Promise<T> {
  await asUser(tx, user);
  try {
    return await fn();
  } finally {
    await asService(tx);
  }
}

describe("favourites", () => {
  it("saves a visible profile once, lists it with only the allowlisted fields, and removes it", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const me = await named(tx);
      const lucia = await named(tx);

      await as(tx, me, async () => {
        await tx`select public.save_profile(${lucia.username})`;
        await tx`select public.save_profile(${lucia.username.toUpperCase()})`;
        const list = await tx`select * from public.get_my_favourites()`;
        expect(list).toHaveLength(1);
        expect(Object.keys(list[0]).sort()).toEqual(FAVOURITE_FIELDS);
        expect(list[0]).toMatchObject({ available: true, username: lucia.username, account_type: "person" });
        const [{ saved }] = await tx`select public.is_profile_saved(${lucia.username}) as saved`;
        expect(saved).toBe(true);

        await tx`select public.unsave_profile(${lucia.username})`;
        expect(await tx`select * from public.get_my_favourites()`).toHaveLength(0);
      });
    });
  });

  it("refuses private, unanswered, suspended and missing profiles, and yourself, all the same way", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const me = await named(tx);
      const privateOne = await named(tx, "private");
      const unanswered = await named(tx, "unset");
      const suspended = await named(tx);
      await tx`update public.profiles set moderation_status = 'suspended' where id = ${suspended.id}`;

      await as(tx, me, async () => {
        for (const username of [privateOne.username, unanswered.username, suspended.username, "nadie_se_llama_asi", me.username]) {
          expect(await errorCode(tx, (sp) => sp`select public.save_profile(${username})`), username).toBe("P0002");
        }
      });
    });
  });

  it("keeps a profile that went private on the list, with nothing about it, and lets you remove it", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const me = await named(tx);
      const lucia = await named(tx);
      await as(tx, me, () => tx`select public.save_profile(${lucia.username})`);
      await tx`update public.profiles set visibility = 'private' where id = ${lucia.id}`;

      await as(tx, me, async () => {
        const [row] = await tx`select * from public.get_my_favourites()`;
        expect(row).toMatchObject({ available: false, username: null, display_name: null, account_type: null });
        await tx`select public.remove_favourite(${row.bookmark_id})`;
        expect(await tx`select * from public.get_my_favourites()`).toHaveLength(0);
      });
    });
  });

  it("is private: nobody else can read, count or change someone's list", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const me = await named(tx);
      const other = await named(tx);
      const lucia = await named(tx);
      await as(tx, me, () => tx`select public.save_profile(${lucia.username})`);
      const [{ id: bookmarkId }] = await tx`select id from public.profile_bookmarks where user_id = ${me.id}`;

      await as(tx, other, async () => {
        expect(await tx`select * from public.get_my_favourites()`).toHaveLength(0);
        expect(await errorCode(tx, (sp) => sp`select count(*) from public.profile_bookmarks`)).toBe("42501");
        expect(
          await errorCode(tx, (sp) => sp`insert into public.profile_bookmarks (user_id, target_id) values (${me.id}, ${other.id})`),
        ).toBe("42501");
        await tx`select public.remove_favourite(${bookmarkId})`;
      });
      const [{ count }] = await tx`select count(*)::int from public.profile_bookmarks where user_id = ${me.id}`;
      expect(count).toBe(1);

      // Lucía herself can't tell she was saved.
      await as(tx, lucia, async () => {
        expect(await tx`select * from public.get_my_favourites()`).toHaveLength(0);
      });
    });
  });

  it("goes away with either account", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const me = await named(tx);
      const lucia = await named(tx);
      await as(tx, me, () => tx`select public.save_profile(${lucia.username})`);
      await tx`delete from auth.users where id = ${lucia.id}`;
      const [{ count }] = await tx`select count(*)::int from public.profile_bookmarks where user_id = ${me.id}`;
      expect(count).toBe(0);
    });
  });

  it("can't be used without a session", async () => {
    await withRollback(async (tx) => {
      await tx`set local role anon`;
      expect(await errorCode(tx, (sp) => sp`select * from public.get_my_favourites()`)).toBe("42501");
      expect(await errorCode(tx, (sp) => sp`select public.save_profile('x')`)).toBe("42501");
    });
  });
});
