// F6a: becoming a roaster (apply → publish the code → an admin decides)
// and the admin's moderation tools. Every admin action needs the role and
// a second factor, never touches another admin, and lands in the log.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, errorCode, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

const DENIED = "42501";
const usernameFor = (id: string) => `t_${id.replace(/-/g, "").slice(0, 12)}`;
type Named = TestUser & { username: string };

async function named(tx: TransactionSql, role: "admin" | "coffee_lover" = "coffee_lover"): Promise<Named> {
  const user = await createUser(tx, { role });
  const username = usernameFor(user.id);
  await tx`update public.profiles set username = ${username}, visibility = 'public' where id = ${user.id}`;
  return { ...user, username };
}

async function as<T>(tx: TransactionSql, user: TestUser, aal: "aal1" | "aal2", fn: () => Promise<T>): Promise<T> {
  await asUser(tx, user, aal);
  try {
    return await fn();
  } finally {
    await asService(tx);
  }
}

async function apply(tx: TransactionSql, user: TestUser) {
  return as(tx, user, "aal1", async () => {
    const [{ code }] = await tx`
      select public.start_roaster_application('La Semilla Coffee Roasters', 'https://lasemilla.example', '@lasemilla', 'Granada', 'hola@lasemilla.example') as code
    `;
    return code as string;
  });
}

async function events(tx: TransactionSql, target: TestUser) {
  return tx`select action, reason from public.moderation_events where target_id = ${target.id} order by created_at`;
}

describe("roaster applications", () => {
  it("gives the applicant a server-made code, and only the applicant sees the application", async () => {
    await withRollback(async (tx) => {
      const applicant = await named(tx);
      const other = await named(tx);
      const code = await apply(tx, applicant);
      expect(code).toMatch(/^grindaily-[0-9A-F]{6}$/);

      await as(tx, applicant, "aal1", async () => {
        const [row] = await tx`select status, verification_code, instagram from public.roaster_applications`;
        expect(row).toEqual({ status: "awaiting_code", verification_code: code, instagram: "lasemilla" });
      });
      await as(tx, other, "aal1", async () => {
        expect(await tx`select id from public.roaster_applications`).toHaveLength(0);
        expect(await errorCode(tx, (sp) => sp`update public.roaster_applications set status = 'approved'`)).toBe(DENIED);
      });
    });
  });

  it("allows one open application at a time, and needs a website or an Instagram", async () => {
    await withRollback(async (tx) => {
      const applicant = await named(tx);
      await apply(tx, applicant);
      await asUser(tx, applicant);
      expect(
        await errorCode(tx, (sp) => sp`select public.start_roaster_application('Otra', 'https://x.example', null, null, 'a@b.example')`),
      ).toBe("23505");
      await asService(tx);

      const second = await named(tx);
      await asUser(tx, second);
      expect(
        await errorCode(tx, (sp) => sp`select public.start_roaster_application('Sin web', null, '  ', null, 'a@b.example')`),
      ).toBe("23514");
    });
  });

  it("goes to the admin's queue once the applicant says the code is published", async () => {
    await withRollback(async (tx) => {
      const applicant = await named(tx);
      const admin = await named(tx, "admin");
      await apply(tx, applicant);

      const queued = () =>
        as(tx, admin, "aal2", () => tx`select username from public.admin_list_roaster_applications('pending')`);
      expect((await queued()).map((r) => r.username)).not.toContain(applicant.username);

      await as(tx, applicant, "aal1", () => tx`select public.submit_roaster_application()`);
      expect((await queued()).map((r) => r.username)).toContain(applicant.username);
    });
  });

  it("approval makes the account a roaster and is logged; rejection keeps it as it was", async () => {
    await withRollback(async (tx) => {
      const admin = await named(tx, "admin");
      for (const approve of [true, false]) {
        const applicant = await named(tx);
        await apply(tx, applicant);
        await as(tx, applicant, "aal1", () => tx`select public.submit_roaster_application()`);
        const [{ id }] = await tx`select id from public.roaster_applications where user_id = ${applicant.id}`;

        await as(tx, admin, "aal2", () =>
          tx`select public.admin_review_roaster_application(${id}, ${approve}, 'Código visto en su web')`,
        );

        const [{ role }] = await tx`select role from public.profiles where id = ${applicant.id}`;
        expect(role).toBe(approve ? "roaster" : "coffee_lover");
        expect(await events(tx, applicant)).toEqual([
          { action: approve ? "roaster_approved" : "roaster_rejected", reason: "Código visto en su web" },
        ]);

        // The applicant is told what happened and why, not by whom.
        const notices = await as(tx, applicant, "aal1", () => tx`select * from public.get_my_moderation_notices()`);
        expect(Object.keys(notices[0]).sort()).toEqual(["action", "created_at", "reason"]);
      }
    });
  });
});

describe("admin actions", () => {
  it("are refused to regular accounts and to admins without the second factor", async () => {
    await withRollback(async (tx) => {
      const regular = await named(tx);
      const admin = await named(tx, "admin");
      const target = await named(tx);
      const calls = [
        (sp: TransactionSql) => sp`select * from public.admin_list_roaster_applications('pending')`,
        (sp: TransactionSql) => sp`select public.admin_set_suspended(${target.username}, true, 'x')`,
        (sp: TransactionSql) => sp`select public.admin_reassign_username(${target.username}, 'x')`,
        (sp: TransactionSql) => sp`select public.admin_reserve_handle('lasemilla', 'x')`,
        (sp: TransactionSql) => sp`select * from public.admin_list_moderation_events()`,
      ];
      for (const [who, aal] of [
        [regular, "aal2"],
        [admin, "aal1"],
      ] as const) {
        await asUser(tx, who, aal);
        for (const call of calls) {
          expect(await errorCode(tx, call)).toBe(DENIED);
        }
        await asService(tx);
      }
    });
  });

  it("never touch another admin, and always need a reason", async () => {
    await withRollback(async (tx) => {
      const admin = await named(tx, "admin");
      const otherAdmin = await named(tx, "admin");
      const target = await named(tx);
      await asUser(tx, admin, "aal2");
      expect(await errorCode(tx, (sp) => sp`select public.admin_set_suspended(${otherAdmin.username}, true, 'x')`)).toBe(DENIED);
      expect(await errorCode(tx, (sp) => sp`select public.admin_set_suspended(${target.username}, true, '   ')`)).toBe("22023");
    });
  });

  it("suspending takes the profile off the public side until reactivated", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const admin = await named(tx, "admin");
      const target = await named(tx);
      const viewer = await named(tx);
      const visible = () => as(tx, viewer, "aal1", () => tx`select * from public.get_public_profile(${target.username})`);

      expect(await visible()).toHaveLength(1);
      await as(tx, admin, "aal2", () => tx`select public.admin_set_suspended(${target.username}, true, 'Suplanta a una tostadora')`);
      expect(await visible()).toHaveLength(0);
      await as(tx, admin, "aal2", () => tx`select public.admin_set_suspended(${target.username}, false, 'Aclarado')`);
      expect(await visible()).toHaveLength(1);
      expect((await events(tx, target)).map((e) => e.action)).toEqual(["profile_suspended", "profile_reactivated"]);
    });
  });

  it("reassigning a username gives a provisional one and reserves the old one", async () => {
    await withRollback(async (tx) => {
      const admin = await named(tx, "admin");
      const target = await named(tx);
      const [{ fresh }] = await as(tx, admin, "aal2", () =>
        tx`select public.admin_reassign_username(${target.username}, 'Es el nombre de una tostadora') as fresh`,
      );
      expect(fresh).toMatch(/^usuario_[0-9a-f]{8}$/);
      const [{ username }] = await tx`select username from public.profiles where id = ${target.id}`;
      expect(username).toBe(fresh);

      const someoneElse = await named(tx);
      await asUser(tx, someoneElse);
      expect(
        await errorCode(tx, (sp) => sp`update public.profiles set username = ${target.username} where id = ${someoneElse.id}`),
      ).toBe("P0001");
    });
  });

  it("revoking a roaster makes it a regular account again", async () => {
    await withRollback(async (tx) => {
      const admin = await named(tx, "admin");
      const roaster = await named(tx);
      await tx`update public.profiles set role = 'roaster' where id = ${roaster.id}`;
      await as(tx, admin, "aal2", () => tx`select public.admin_revoke_roaster(${roaster.username}, 'Ya no es tostadora')`);
      const [{ role }] = await tx`select role from public.profiles where id = ${roaster.id}`;
      expect(role).toBe("coffee_lover");
    });
  });

  it("reserving and releasing a handle are logged, and the log names usernames, not ids", async () => {
    await withRollback(async (tx) => {
      const admin = await named(tx, "admin");
      const handle = `zq${Math.random().toString(36).slice(2, 8)}`;
      await as(tx, admin, "aal2", async () => {
        await tx`select public.admin_reserve_handle(${`@${handle}`}, 'Tostadora conocida')`;
        expect((await tx`select handle from public.admin_list_reserved_handles()`).map((r) => r.handle)).toContain(handle);
        await tx`select public.admin_unreserve_handle(${handle}, 'Ya tiene cuenta')`;
        const log = await tx`select * from public.admin_list_moderation_events()`;
        expect(Object.keys(log[0]).sort()).toEqual([
          "action",
          "actor_username",
          "created_at",
          "details",
          "reason",
          "target_username",
        ]);
        // Both land in this one transaction, so they share a timestamp.
        const mine = log.filter((r) => r.details?.handle === handle);
        expect(mine.map((r) => r.action).sort()).toEqual(["handle_reserved", "handle_unreserved"]);
        expect(mine.every((r) => r.actor_username === admin.username)).toBe(true);
      });
    });
  });
});
