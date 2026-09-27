// F0 of the public-profiles plan: nobody can promote themselves, admin
// powers need a second factor, and the moderation log and kill switch are
// out of every client's reach.
import { afterAll, describe, expect, it } from "vitest";
import { asUser, closeDb, createUser, errorCode, withRollback } from "./helpers/db";

afterAll(closeDb);

const PERMISSION_DENIED = "42501";

describe("profiles column grants", () => {
  it("lets a user edit their own display name, username and language", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      const rows = await tx`
        update public.profiles
        set display_name = 'Nuevo nombre', username = ${`u${a.id.slice(0, 8)}`}, locale = 'en'
        where id = ${a.id}
        returning id
      `;
      expect(rows).toHaveLength(1);
    });
  });

  it("refuses a user changing their own role", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a, "aal2");
      const code = await errorCode(tx, (sp) => sp`update public.profiles set role = 'admin' where id = ${a.id}`);
      expect(code).toBe(PERMISSION_DENIED);
    });
  });

  it("refuses every column outside the three editable ones", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a);
      for (const column of ["id", "is_anonymous", "created_at", "updated_at"]) {
        const code = await errorCode(tx, (sp) =>
          sp.unsafe(`update public.profiles set ${column} = ${column} where id = $1`, [a.id]),
        );
        expect(code, column).toBe(PERMISSION_DENIED);
      }
    });
  });

  it("still can't touch someone else's profile", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx, { display_name: "B" });
      await asUser(tx, a);
      const rows = await tx`update public.profiles set display_name = 'hacked' where id = ${b.id} returning id`;
      expect(rows).toHaveLength(0);
    });
  });
});

describe("set_profile_role", () => {
  it("is refused to a regular account, even with a second factor", async () => {
    await withRollback(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      await asUser(tx, a, "aal2");
      const code = await errorCode(tx, (sp) => sp`select public.set_profile_role(${b.id}, 'coffee_lover', 'test')`);
      expect(code).toBe(PERMISSION_DENIED);
    });
  });

  it("is refused to an admin whose session hasn't passed the second factor", async () => {
    await withRollback(async (tx) => {
      const admin = await createUser(tx, { role: "admin" });
      const b = await createUser(tx);
      await asUser(tx, admin, "aal1");
      const code = await errorCode(tx, (sp) => sp`select public.set_profile_role(${b.id}, 'coffee_lover', 'test')`);
      expect(code).toBe(PERMISSION_DENIED);
    });
  });

  it("never grants or removes the admin role", async () => {
    await withRollback(async (tx) => {
      const admin = await createUser(tx, { role: "admin" });
      const otherAdmin = await createUser(tx, { role: "admin" });
      const b = await createUser(tx);
      await asUser(tx, admin, "aal2");
      expect(await errorCode(tx, (sp) => sp`select public.set_profile_role(${b.id}, 'admin', 'test')`)).toBe(
        PERMISSION_DENIED,
      );
      expect(
        await errorCode(tx, (sp) => sp`select public.set_profile_role(${otherAdmin.id}, 'coffee_lover', 'test')`),
      ).toBe(PERMISSION_DENIED);
      expect(
        await errorCode(tx, (sp) => sp`select public.set_profile_role(${admin.id}, 'coffee_lover', 'test')`),
      ).toBe(PERMISSION_DENIED);
    });
  });

  it("requires a reason and rejects roles that don't exist", async () => {
    await withRollback(async (tx) => {
      const admin = await createUser(tx, { role: "admin" });
      const b = await createUser(tx);
      await asUser(tx, admin, "aal2");
      expect(await errorCode(tx, (sp) => sp`select public.set_profile_role(${b.id}, 'coffee_lover', '  ')`)).toBe(
        "22023",
      );
      expect(await errorCode(tx, (sp) => sp`select public.set_profile_role(${b.id}, 'superuser', 'test')`)).toBe(
        "23514",
      );
    });
  });
});

describe("moderation_events", () => {
  it("can't be read or written by a regular account", async () => {
    await withRollback(async (tx) => {
      await tx`insert into public.moderation_events (action, reason) values ('role_changed', 'seed')`;
      const a = await createUser(tx);
      await asUser(tx, a, "aal2");
      expect(await tx`select id from public.moderation_events`).toHaveLength(0);
      expect(
        await errorCode(tx, (sp) => sp`insert into public.moderation_events (action, reason) values ('role_changed', 'x')`),
      ).toBe(PERMISSION_DENIED);
    });
  });

  it("is readable by an admin only with a second factor, and never editable", async () => {
    await withRollback(async (tx) => {
      await tx`insert into public.moderation_events (action, reason) values ('role_changed', 'seed')`;
      const admin = await createUser(tx, { role: "admin" });

      await asUser(tx, admin, "aal1");
      expect(await tx`select id from public.moderation_events`).toHaveLength(0);

      await asUser(tx, admin, "aal2");
      expect((await tx`select id from public.moderation_events`).length).toBeGreaterThan(0);
      expect(await errorCode(tx, (sp) => sp`update public.moderation_events set reason = 'edited'`)).toBe(
        PERMISSION_DENIED,
      );
      expect(await errorCode(tx, (sp) => sp`delete from public.moderation_events`)).toBe(PERMISSION_DENIED);
    });
  });
});

describe("app_settings (kill switch)", () => {
  it("starts off and can't be read or changed by any account", async () => {
    await withRollback(async (tx) => {
      const [settings] = await tx`select social_enabled from public.app_settings`;
      expect(settings.social_enabled).toBe("off");

      const admin = await createUser(tx, { role: "admin" });
      await asUser(tx, admin, "aal2");
      expect(await errorCode(tx, (sp) => sp`select * from public.app_settings`)).toBe(PERMISSION_DENIED);
      expect(await errorCode(tx, (sp) => sp`update public.app_settings set social_enabled = 'all'`)).toBe(
        PERMISSION_DENIED,
      );
    });
  });
});

// There is no successful role change to test yet: the only roles are admin
// (out of the function's reach) and coffee_lover. F6a adds roaster and,
// with it, the test that an approval changes the role and lands in the log.
