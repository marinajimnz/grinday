// F8: reports. Anyone can flag a public profile; only an admin with a
// second factor reads them; the reported account never learns who; limits
// keep the button from being a weapon; nothing happens without an admin.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, errorCode, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

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

const report = (tx: TransactionSql, username: string, reason = "impersonation") =>
  tx`select public.report_profile(${username}, ${reason}, 'Se hace pasar por La Semilla')`;

describe("reporting", () => {
  it("files a report the reporter can't read back, and nobody else can either", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const reporter = await named(tx);
      const target = await named(tx);
      await as(tx, reporter, "aal1", () => report(tx, target.username));

      const [{ count }] = await tx`select count(*)::int from public.profile_reports where target_id = ${target.id}`;
      expect(count).toBe(1);
      for (const who of [reporter, target]) {
        await asUser(tx, who, "aal2");
        expect(await errorCode(tx, (sp) => sp`select * from public.profile_reports`)).toBe("42501");
        expect(await errorCode(tx, (sp) => sp`select * from public.admin_list_reports()`)).toBe("42501");
        await asService(tx);
      }
      // The reported account's notices say nothing about being reported.
      const notices = await as(tx, target, "aal1", () => tx`select * from public.get_my_moderation_notices()`);
      expect(notices).toHaveLength(0);
    });
  });

  it("refuses private, missing and own profiles alike, and unknown reasons", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const reporter = await named(tx);
      const privateOne = await named(tx);
      await tx`update public.profiles set visibility = 'private' where id = ${privateOne.id}`;
      const target = await named(tx);
      await asUser(tx, reporter);
      for (const username of [privateOne.username, "nadie_se_llama_asi", reporter.username]) {
        expect(await errorCode(tx, (sp) => report(sp, username)), username).toBe("P0002");
      }
      expect(await errorCode(tx, (sp) => report(sp, target.username, "me_cae_mal"))).toBe("23514");
    });
  });

  it("counts a repeat while the first is open as the same report, and caps reports at 10 a day", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const reporter = await named(tx);
      const targets: Named[] = [];
      for (let i = 0; i < 11; i++) targets.push(await named(tx));

      await as(tx, reporter, "aal1", async () => {
        await report(tx, targets[0].username);
        await report(tx, targets[0].username);
      });
      const [{ count }] = await tx`select count(*)::int from public.profile_reports where reporter_id = ${reporter.id}`;
      expect(count).toBe(1);

      await asUser(tx, reporter);
      for (let i = 1; i < 10; i++) await report(tx, targets[i].username);
      expect(await errorCode(tx, (sp) => report(sp, targets[10].username))).toBe("P0003");
    });
  });
});

describe("admin report queue", () => {
  it("groups open reports by profile, naming reporters, for an admin with a second factor", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const admin = await named(tx, "admin");
      const target = await named(tx);
      const a = await named(tx);
      const b = await named(tx);
      await as(tx, a, "aal1", () => report(tx, target.username));
      await as(tx, b, "aal1", () => report(tx, target.username, "spam"));

      await as(tx, admin, "aal2", async () => {
        const queue = await tx`select * from public.admin_list_reports()`;
        const row = queue.find((r) => r.username === target.username)!;
        expect(row.open_count).toBe(2);
        expect(row.reports.map((r: { reporter: string }) => r.reporter).sort()).toEqual([a.username, b.username].sort());
        const [{ n }] = await tx`select public.admin_open_report_count() as n`;
        expect(n).toBeGreaterThanOrEqual(1);
      });

      await asUser(tx, admin, "aal1");
      expect(await errorCode(tx, (sp) => sp`select * from public.admin_list_reports()`)).toBe("42501");
    });
  });

  it("dismissing closes the reports and changes nothing else; suspending also takes the profile down", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const admin = await named(tx, "admin");
      const reporter = await named(tx);

      for (const action of ["dismiss", "suspend"] as const) {
        const target = await named(tx);
        await as(tx, reporter, "aal1", () => report(tx, target.username));
        await as(tx, admin, "aal2", () =>
          tx`select public.admin_resolve_reports(${target.username}, ${action}, 'Revisado')`,
        );

        const [{ status }] = await tx`select status from public.profile_reports where target_id = ${target.id}`;
        expect(status).toBe(action === "dismiss" ? "dismissed" : "resolved");
        const [{ moderation_status }] = await tx`select moderation_status from public.profiles where id = ${target.id}`;
        expect(moderation_status).toBe(action === "dismiss" ? "active" : "suspended");
        const log = await tx`select action from public.moderation_events where target_id = ${target.id} order by action`;
        expect(log.map((e) => e.action)).toEqual(
          action === "dismiss" ? ["report_dismissed"] : ["profile_suspended", "report_resolved"],
        );
      }
    });
  });
});
