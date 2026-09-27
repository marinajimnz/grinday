// F1: handle, bio and the explicit public/private choice. Nothing here
// makes a profile readable by anyone else yet; these check the rules the
// later public functions will rely on.
import { afterAll, describe, expect, it } from "vitest";
import { asService, asUser, closeDb, createUser, errorCode, withRollback } from "./helpers/db";

afterAll(closeDb);

const handleFor = (id: string) => `t_${id.replace(/-/g, "").slice(0, 12)}`;

describe("visibility", () => {
  it("starts unset for every new account", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      const [profile] = await tx`select visibility, visibility_chosen_at, handle from public.profiles where id = ${a.id}`;
      expect(profile).toEqual({ visibility: "unset", visibility_chosen_at: null, handle: null });
    });
  });

  it("records when the account chose, and never lets a client write that date", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      await tx`update public.profiles set visibility = 'private' where id = ${a.id}`;
      const [profile] = await tx`select visibility, visibility_chosen_at from public.profiles where id = ${a.id}`;
      expect(profile.visibility).toBe("private");
      expect(profile.visibility_chosen_at).toBeInstanceOf(Date);

      expect(
        await errorCode(tx, (sp) => sp`update public.profiles set visibility_chosen_at = null where id = ${a.id}`),
      ).toBe("42501");
    });
  });

  it("can't go back to unset once chosen", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      await tx`update public.profiles set visibility = 'private' where id = ${a.id}`;
      expect(await errorCode(tx, (sp) => sp`update public.profiles set visibility = 'unset' where id = ${a.id}`)).toBe(
        "22023",
      );
    });
  });

  it("can't be public without a handle", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      expect(await errorCode(tx, (sp) => sp`update public.profiles set visibility = 'public' where id = ${a.id}`)).toBe(
        "23514",
      );
      await tx`update public.profiles set handle = ${handleFor(a.id)}, visibility = 'public' where id = ${a.id}`;
      const [profile] = await tx`select visibility from public.profiles where id = ${a.id}`;
      expect(profile.visibility).toBe("public");
    });
  });

  it("keeps the chosen date when other fields change", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      await tx`update public.profiles set visibility = 'private' where id = ${a.id}`;
      const [before] = await tx`select visibility_chosen_at from public.profiles where id = ${a.id}`;
      await tx`update public.profiles set bio = 'Filtros de fin de semana' where id = ${a.id}`;
      const [after] = await tx`select visibility_chosen_at from public.profiles where id = ${a.id}`;
      expect(after.visibility_chosen_at).toEqual(before.visibility_chosen_at);
    });
  });
});

describe("handle", () => {
  it("must be 3-30 lowercase letters, digits or underscores", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      for (const bad of ["ab", "Mayusculas", "con espacio", "tildé", "a".repeat(31), "guion-medio"]) {
        expect(await errorCode(tx, (sp) => sp`update public.profiles set handle = ${bad} where id = ${a.id}`), bad).toBe(
          "23514",
        );
      }
    });
  });

  it("is unique", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const handle = handleFor(a.id);
      await asUser(tx, a);
      await tx`update public.profiles set handle = ${handle} where id = ${a.id}`;
      await asUser(tx, b);
      expect(await errorCode(tx, (sp) => sp`update public.profiles set handle = ${handle} where id = ${b.id}`)).toBe(
        "23505",
      );
    });
  });

  it("can't be a reserved one, and the reserved list is private", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      expect(await errorCode(tx, (sp) => sp`update public.profiles set handle = 'grindaily' where id = ${a.id}`)).toBe(
        "P0001",
      );
      expect(await errorCode(tx, (sp) => sp`select handle from public.reserved_handles`)).toBe("42501");
    });
  });

  it("bio is capped at 160 characters", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      expect(
        await errorCode(tx, (sp) => sp`update public.profiles set bio = ${"x".repeat(161)} where id = ${a.id}`),
      ).toBe("23514");
    });
  });
});

describe("social_enabled_for_me", () => {
  it("follows the kill switch: off for everyone, admins only, then everyone", async () => {
    await withRollback(async (tx) => {
      const admin = await createUser(tx, { role: "admin" });
      const regular = await createUser(tx);

      const check = async () => {
        await asUser(tx, admin);
        const [{ enabled: forAdmin }] = await tx`select public.social_enabled_for_me() as enabled`;
        await asUser(tx, regular);
        const [{ enabled: forRegular }] = await tx`select public.social_enabled_for_me() as enabled`;
        await asService(tx);
        return [forAdmin, forRegular];
      };

      await tx`update public.app_settings set social_enabled = 'off'`;
      expect(await check()).toEqual([false, false]);
      await tx`update public.app_settings set social_enabled = 'admins'`;
      expect(await check()).toEqual([true, false]);
      await tx`update public.app_settings set social_enabled = 'all'`;
      expect(await check()).toEqual([true, true]);
    });
  });
});
