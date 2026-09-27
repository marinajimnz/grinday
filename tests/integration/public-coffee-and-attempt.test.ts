// Opening a coffee or an attempt from a public profile: exactly the fields
// allowed, only for coffees and attempts the profile would show, and an id
// from someone else's profile (or a private one) gets nothing.
import { afterAll, describe, expect, it } from "vitest";
import type { TransactionSql } from "postgres";
import { asService, asUser, closeDb, createUser, errorCode, withRollback, type TestUser } from "./helpers/db";

afterAll(closeDb);

const COFFEE_FIELDS = [
  "altitude_max_m",
  "altitude_min_m",
  "country",
  "farm",
  "name",
  "process",
  "producer",
  "region",
  "roast_level",
  "roaster",
  "tasting_notes",
  "varieties",
];
const COFFEE_ATTEMPT_FIELDS = [
  "brewed_on",
  "cup_count",
  "dilution_water_g",
  "dose_g",
  "extraction_ms",
  "grind",
  "id",
  "is_preferred",
  "method",
  "output_weight_g",
  "overall_rating",
  "target_weight_g",
  "water_g",
];
const ATTEMPT_FIELDS = [
  "brewed_on",
  "coffee_id",
  "coffee_name",
  "cup_count",
  "dilution_water_g",
  "dose_g",
  "equipment_model_name",
  "extraction_ms",
  "grind_seconds",
  "grind_setting",
  "grinder_lower_burr",
  "grinder_model_name",
  "grinder_upper_burr",
  "heat_intensity",
  "input_weight_g",
  "is_preferred",
  "method",
  "moka_cup_size",
  "output_weight_g",
  "overall_rating",
  "roaster",
  "target_weight_g",
  "temperature_c",
  "water_g",
];

const usernameFor = (id: string) => `t_${id.replace(/-/g, "").slice(0, 12)}`;
type Owner = TestUser & { username: string };

async function owner(tx: TransactionSql, visibility: "public" | "private" = "public"): Promise<Owner> {
  const user = await createUser(tx);
  const username = usernameFor(user.id);
  await tx`update public.profiles set username = ${username}, visibility = ${visibility} where id = ${user.id}`;
  return { ...user, username };
}

async function coffee(tx: TransactionSql, user: TestUser, extra: { archived?: boolean } = {}) {
  const [row] = await tx`
    insert into public.coffees ${tx({
      user_id: user.id,
      name: "Guji Shakiso",
      roaster: "La Semilla",
      country: "Etiopía",
      region: "Guji",
      farm: "Shakiso",
      producer: "Cooperativa",
      varieties: ["Heirloom"],
      process: "Lavado",
      altitude_min_m: 1900,
      altitude_max_m: 2200,
      roast_level: "light",
      tasting_notes: ["Floral", "Cítrico"],
      archived_at: extra.archived ? new Date() : null,
    })}
    returning id
  `;
  const [bag] = await tx`insert into public.coffee_bags (coffee_id, user_id) values (${row.id}, ${user.id}) returning id`;
  return { id: row.id as string, bagId: bag.id as string };
}

async function attempt(tx: TransactionSql, user: TestUser, c: { id: string; bagId: string }, fields: Record<string, unknown> = {}) {
  const [row] = await tx`
    insert into public.brew_attempts ${tx({
      user_id: user.id,
      coffee_id: c.id,
      coffee_bag_id: c.bagId,
      method: "v60",
      dose_g: 18,
      water_g: 290,
      temperature_c: 94,
      grind_setting: 18,
      overall_rating: 4,
      notes: "NOTA PRIVADA",
      acidity: 5,
      equipment_snapshot: { grinder_model_name: "Comandante C40", equipment_model_name: "Hario V60-02" },
      ...fields,
    })}
    returning id
  `;
  return row.id as string;
}

async function call(tx: TransactionSql, viewer: TestUser, fn: string, username: string, id: string) {
  await asUser(tx, viewer);
  const rows = await tx.unsafe(`select * from public.${fn}($1, $2)`, [username, id]);
  await asService(tx);
  return rows;
}

describe("get_public_coffee", () => {
  it("returns the coffee's facts and nothing else", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const guji = await coffee(tx, lucia);
      const [row] = await call(tx, viewer, "get_public_coffee", lucia.username, guji.id);
      expect(Object.keys(row).sort()).toEqual(COFFEE_FIELDS);
      expect(row).toMatchObject({ country: "Etiopía", roast_level: "light", tasting_notes: ["Floral", "Cítrico"] });
    });
  });

  it("gives nothing for an archived coffee, someone else's coffee, or a private profile", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const other = await owner(tx);
      const privateOne = await owner(tx, "private");
      const viewer = await createUser(tx);
      const archived = await coffee(tx, lucia, { archived: true });
      const othersCoffee = await coffee(tx, other);
      const privateCoffee = await coffee(tx, privateOne);

      expect(await call(tx, viewer, "get_public_coffee", lucia.username, archived.id)).toHaveLength(0);
      // Right id, wrong profile in the URL.
      expect(await call(tx, viewer, "get_public_coffee", lucia.username, othersCoffee.id)).toHaveLength(0);
      expect(await call(tx, viewer, "get_public_coffee", privateOne.username, privateCoffee.id)).toHaveLength(0);
    });
  });
});

describe("get_public_coffee_attempts", () => {
  it("returns the latest four not hidden from Home, plus the preferred one flagged wherever it falls", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const guji = await coffee(tx, lucia);
      const ids: string[] = [];
      for (let i = 0; i < 6; i++) {
        ids.push(await attempt(tx, lucia, guji, { dose_g: 10 + i, created_at: new Date(Date.UTC(2026, 8, 1 + i, 9)) }));
      }
      await attempt(tx, lucia, guji, { hidden_from_dashboard: true, created_at: new Date(Date.UTC(2026, 8, 20, 9)) });
      // The oldest one is the preferred recipe.
      await tx`update public.coffees set preferred_attempt_id = ${ids[0]} where id = ${guji.id}`;

      const rows = await call(tx, viewer, "get_public_coffee_attempts", lucia.username, guji.id);
      expect(Object.keys(rows[0]).sort()).toEqual(COFFEE_ATTEMPT_FIELDS);
      expect(rows.map((r) => Number(r.dose_g))).toEqual([15, 14, 13, 12, 10]);
      expect(rows.filter((r) => r.is_preferred).map((r) => r.id)).toEqual([ids[0]]);
    });
  });
});

describe("get_public_attempt", () => {
  it("returns the configuration and rating, never notes or tasting scores", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const guji = await coffee(tx, lucia);
      const id = await attempt(tx, lucia, guji);

      const [row] = await call(tx, viewer, "get_public_attempt", lucia.username, id);
      expect(Object.keys(row).sort()).toEqual(ATTEMPT_FIELDS);
      expect(row).toMatchObject({
        coffee_id: guji.id,
        method: "v60",
        grinder_model_name: "Comandante C40",
        equipment_model_name: "Hario V60-02",
        overall_rating: 4,
        is_preferred: false,
      });
      expect(JSON.stringify(row)).not.toContain("NOTA PRIVADA");
    });
  });

  it("gives nothing for an attempt hidden from Home, unless it's the preferred recipe", async () => {
    await withRollback(async (tx) => {
      await tx`update public.app_settings set social_enabled = 'all'`;
      const lucia = await owner(tx);
      const viewer = await createUser(tx);
      const guji = await coffee(tx, lucia);
      const hidden = await attempt(tx, lucia, guji, { hidden_from_dashboard: true });
      expect(await call(tx, viewer, "get_public_attempt", lucia.username, hidden)).toHaveLength(0);

      await tx`update public.coffees set preferred_attempt_id = ${hidden} where id = ${guji.id}`;
      const [row] = await call(tx, viewer, "get_public_attempt", lucia.username, hidden);
      expect(row.is_preferred).toBe(true);
    });
  });

  it("gives nothing for an archived coffee, someone else's attempt, a private profile, or with the switch off", async () => {
    await withRollback(async (tx) => {
      const lucia = await owner(tx);
      const other = await owner(tx);
      const privateOne = await owner(tx, "private");
      const viewer = await createUser(tx);
      const archivedAttempt = await attempt(tx, lucia, await coffee(tx, lucia, { archived: true }));
      const othersAttempt = await attempt(tx, other, await coffee(tx, other));
      const privateAttempt = await attempt(tx, privateOne, await coffee(tx, privateOne));
      const visible = await attempt(tx, lucia, await coffee(tx, lucia));

      await tx`update public.app_settings set social_enabled = 'all'`;
      expect(await call(tx, viewer, "get_public_attempt", lucia.username, archivedAttempt)).toHaveLength(0);
      expect(await call(tx, viewer, "get_public_attempt", lucia.username, othersAttempt)).toHaveLength(0);
      expect(await call(tx, viewer, "get_public_attempt", privateOne.username, privateAttempt)).toHaveLength(0);
      expect(await call(tx, viewer, "get_public_attempt", lucia.username, visible)).toHaveLength(1);

      await tx`update public.app_settings set social_enabled = 'admins'`;
      expect(await call(tx, viewer, "get_public_attempt", lucia.username, visible)).toHaveLength(0);
    });
  });

  it("none of the detail functions can be called without a session", async () => {
    await withRollback(async (tx) => {
      await tx`set local role anon`;
      for (const fn of ["get_public_coffee", "get_public_coffee_attempts", "get_public_attempt"]) {
        expect(
          await errorCode(tx, (sp) => sp.unsafe(`select * from public.${fn}('x', gen_random_uuid())`)),
          fn,
        ).toBe("42501");
      }
    });
  });
});
