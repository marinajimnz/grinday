// F4: coffees, equipment and latest attempts of a public profile. Pins the
// exact fields each answer carries and everything it must leave out.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, errorCode, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

const COFFEE_FIELDS = ["country", "has_recipe", "id", "name", "process", "recipe_grind", "recipe_method", "roaster"];
const EQUIPMENT_FIELDS = ["kind", "model_name"];
const ATTEMPT_FIELDS = [
  "brewed_on",
  "coffee_name",
  "cup_count",
  "dilution_water_g",
  "dose_g",
  "extraction_ms",
  "grind",
  "id",
  "method",
  "output_weight_g",
  "overall_rating",
  "roaster",
  "target_weight_g",
  "water_g",
];

const usernameFor = (id: string) => `t_${id.replace(/-/g, "").slice(0, 12)}`;

type Owner = TestUser & { username: string };

async function owner(tx: TransactionSql, visibility: "public" | "private" = "public"): Promise<Owner> {
  const user = await createUser(tx, { display_name: "Lucía" });
  const username = usernameFor(user.id);
  await tx`update public.profiles set username = ${username}, visibility = ${visibility} where id = ${user.id}`;
  return { ...user, username };
}

async function coffee(tx: TransactionSql, user: TestUser, name: string, extra: { archived?: boolean } = {}) {
  const [row] = await tx`
    insert into public.coffees (user_id, name, roaster, country, process, archived_at)
    values (${user.id}, ${name}, 'La Semilla', 'Etiopía', 'Lavado', ${extra.archived ? new Date() : null})
    returning id
  `;
  const [bag] = await tx`insert into public.coffee_bags (coffee_id, user_id) values (${row.id}, ${user.id}) returning id`;
  return { id: row.id as string, bagId: bag.id as string };
}

async function attempt(
  tx: TransactionSql,
  user: TestUser,
  c: { id: string; bagId: string },
  fields: Record<string, unknown> = {},
) {
  const [row] = await tx`
    insert into public.brew_attempts ${tx({
      user_id: user.id,
      coffee_id: c.id,
      coffee_bag_id: c.bagId,
      method: "v60",
      dose_g: 18,
      water_g: 290,
      extraction_ms: 165000,
      grind_setting: 18,
      overall_rating: 4,
      notes: "NOTA PRIVADA",
      ...fields,
    })}
    returning id
  `;
  return row.id as string;
}

async function read(tx: TransactionSql, viewer: TestUser, fn: string, username: string) {
  await asUser(tx, viewer);
  const rows = await tx.unsafe(`select * from public.${fn}($1)`, [username]);
  await asService(tx);
  return rows;
}

const FUNCTIONS = ["get_public_coffees", "get_public_equipment", "get_public_recent_attempts"];

describe("public profile content", () => {
  it("returns exactly the allowlisted fields", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const guji = await coffee(tx, lucia, "Guji");
      const preferred = await attempt(tx, lucia, guji);
      await tx`update public.coffees set preferred_attempt_id = ${preferred} where id = ${guji.id}`;
      await tx`insert into public.user_grinders (user_id, model_name, is_default) values (${lucia.id}, 'Comandante C40', true)`;
      await tx`insert into public.user_brew_equipment (user_id, method, model_name, is_default) values (${lucia.id}, 'v60', 'Hario V60-02', true)`;

      const [c] = await read(tx, viewer, "get_public_coffees", lucia.username);
      expect(Object.keys(c).sort()).toEqual(COFFEE_FIELDS);
      expect(c).toEqual({
        id: guji.id,
        name: "Guji",
        roaster: "La Semilla",
        country: "Etiopía",
        process: "Lavado",
        has_recipe: true,
        recipe_method: "v60",
        recipe_grind: "18",
      });

      const equipment = await read(tx, viewer, "get_public_equipment", lucia.username);
      expect(Object.keys(equipment[0]).sort()).toEqual(EQUIPMENT_FIELDS);
      expect(equipment).toEqual([
        { kind: "grinder", model_name: "Comandante C40" },
        { kind: "v60", model_name: "Hario V60-02" },
      ]);

      const [a] = await read(tx, viewer, "get_public_recent_attempts", lucia.username);
      expect(Object.keys(a).sort()).toEqual(ATTEMPT_FIELDS);
      expect(a.brewed_on).toBeInstanceOf(Date);
      expect(a).toMatchObject({ method: "v60", coffee_name: "Guji", grind: "18", overall_rating: 4 });
      expect(JSON.stringify(a)).not.toContain("NOTA PRIVADA");
    });
  });

  it("leaves out archived coffees and attempts hidden from Home", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const kept = await coffee(tx, lucia, "Guji");
      const archived = await coffee(tx, lucia, "Viejo", { archived: true });
      await attempt(tx, lucia, kept, { method: "chemex" });
      await attempt(tx, lucia, kept, { method: "aeropress", hidden_from_dashboard: true });
      await attempt(tx, lucia, archived, { method: "moka" });

      expect((await read(tx, viewer, "get_public_coffees", lucia.username)).map((r) => r.name)).toEqual(["Guji"]);
      expect((await read(tx, viewer, "get_public_recent_attempts", lucia.username)).map((r) => r.method)).toEqual([
        "chemex",
      ]);
    });
  });

  it("shows only the latest twelve attempts, newest first", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const guji = await coffee(tx, lucia, "Guji");
      for (let i = 0; i < 14; i++) {
        await attempt(tx, lucia, guji, { dose_g: 10 + i, created_at: new Date(Date.UTC(2026, 8, 1 + i, 10)) });
      }
      const rows = await read(tx, viewer, "get_public_recent_attempts", lucia.username);
      expect(rows.map((r) => Number(r.dose_g))).toEqual([23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12]);
    });
  });

  it("labels a dual-burr grind with both dials", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const guji = await coffee(tx, lucia, "Guji");
      await attempt(tx, lucia, guji, { grind_setting: null, grinder_upper_burr: 12, grinder_lower_burr: 8 });
      const [row] = await read(tx, viewer, "get_public_recent_attempts", lucia.username);
      expect(row.grind).toBe("12·8");
    });
  });

  it("answers nothing for a private profile, or while the switch is off for the viewer", async () => {
    await withRollback(async (tx) => {
      const privateOne = await owner(tx, "private");
      const lucia = await owner(tx);
      const regular = await createUser(tx);
      for (const who of [privateOne, lucia]) {
        const c = await coffee(tx, who, "Guji");
        await attempt(tx, who, c);
        await tx`insert into public.user_grinders (user_id, model_name) values (${who.id}, 'Comandante C40')`;
      }

      await tx`update public.app_settings set social_enabled = 'all'`;
      for (const fn of FUNCTIONS) {
        expect(await read(tx, regular, fn, privateOne.username), fn).toHaveLength(0);
        expect(await read(tx, regular, fn, lucia.username), fn).not.toHaveLength(0);
      }

      await tx`update public.app_settings set social_enabled = 'admins'`;
      for (const fn of FUNCTIONS) {
        expect(await read(tx, regular, fn, lucia.username), fn).toHaveLength(0);
      }
    });
  });

  it("can't be called without a session", async () => {
    await withRollback(async (tx) => {
      await tx`set local role anon`;
      for (const fn of FUNCTIONS) {
        expect(await errorCode(tx, (sp) => sp.unsafe(`select * from public.${fn}('x')`)), fn).toBe("42501");
      }
    });
  });
});
