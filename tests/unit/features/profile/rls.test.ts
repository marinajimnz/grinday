// Integration test against the real linked Supabase project. Uses the
// persistent test-fixture users (tests/unit/helpers/testUsers.ts) so the
// suite doesn't create/delete a throwaway account on every run — it only
// cleans up the coffee/bag/attempt rows it creates under those accounts.
// Needs .env.local (or real env vars) and the 0026/0027 migrations applied.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, getTestUser, type TestFixtureUser } from "../../helpers/testUsers";

describe("public profile RLS (Fase 8)", () => {
  let userA: TestFixtureUser;
  let userB: TestFixtureUser;
  let userMachineId: string;
  let coffeeId: string;
  let bagId: string;
  let attemptId: string;

  beforeAll(async () => {
    userA = await getTestUser("a");
    userB = await getTestUser("b");

    const { data: machine, error: machineModelError } = await admin
      .from("machine_models")
      .select("id")
      .eq("slug", "sage-barista-express-impress")
      .single();
    if (machineModelError || !machine) throw machineModelError ?? new Error("seed machine model not found");

    const { data: userMachine, error: machineErr } = await userA.client
      .from("user_machines")
      .insert({ user_id: userA.id, machine_model_id: machine.id })
      .select("id")
      .single();
    if (machineErr || !userMachine) throw machineErr ?? new Error("no user_machine");
    userMachineId = userMachine.id;

    const { data: coffee, error: coffeeErr } = await userA.client
      .from("coffees")
      .insert({ user_id: userA.id, name: "RLS test coffee", roaster: "Test Roaster" })
      .select("id")
      .single();
    if (coffeeErr || !coffee) throw coffeeErr ?? new Error("no coffee");
    coffeeId = coffee.id;

    const { data: bag, error: bagErr } = await userA.client
      .from("coffee_bags")
      .insert({ coffee_id: coffeeId, user_id: userA.id })
      .select("id")
      .single();
    if (bagErr || !bag) throw bagErr ?? new Error("no bag");
    bagId = bag.id;

    const { data: attempt, error: attemptErr } = await userA.client
      .from("brew_attempts")
      .insert({
        user_id: userA.id,
        coffee_id: coffeeId,
        coffee_bag_id: bagId,
        machine_id: userMachineId,
      })
      .select("id")
      .single();
    if (attemptErr || !attempt) throw attemptErr ?? new Error("no attempt");
    attemptId = attempt.id;
  });

  afterAll(async () => {
    // Deletes cascade (brew_attempts -> coffee_bags -> coffees via FK on
    // delete cascade), so removing the coffee is enough for those three;
    // the user_machine is independent and needs its own cleanup.
    await admin.from("coffees").delete().eq("id", coffeeId);
    await admin.from("user_machines").delete().eq("id", userMachineId);
  });

  it("lets B select A's public coffees and brew_attempts", async () => {
    const { data: coffees, error: coffeesError } = await userB.client
      .from("coffees")
      .select("id")
      .eq("id", coffeeId);
    expect(coffeesError).toBeNull();
    expect(coffees).toHaveLength(1);

    const { data: attempts, error: attemptsError } = await userB.client
      .from("brew_attempts")
      .select("id")
      .eq("id", attemptId);
    expect(attemptsError).toBeNull();
    expect(attempts).toHaveLength(1);
  });

  it("blocks B from inserting/updating/deleting A's coffees", async () => {
    const { error: insertError } = await userB.client
      .from("coffees")
      .insert({ user_id: userA.id, name: "hijack", roaster: "hijack" });
    expect(insertError).not.toBeNull();

    const { data: updateData } = await userB.client
      .from("coffees")
      .update({ name: "hijacked" })
      .eq("id", coffeeId)
      .select();
    expect(updateData ?? []).toHaveLength(0);

    const { data: deleteData } = await userB.client
      .from("coffees")
      .delete()
      .eq("id", coffeeId)
      .select();
    expect(deleteData ?? []).toHaveLength(0);
  });

  it("blocks B from updating/deleting A's brew_attempts", async () => {
    const { data: updateData } = await userB.client
      .from("brew_attempts")
      .update({ notes: "hijacked" })
      .eq("id", attemptId)
      .select();
    expect(updateData ?? []).toHaveLength(0);

    const { data: deleteData } = await userB.client
      .from("brew_attempts")
      .delete()
      .eq("id", attemptId)
      .select();
    expect(deleteData ?? []).toHaveLength(0);
  });

  it("never lets B read A's coffee_bags", async () => {
    const { data, error } = await userB.client.from("coffee_bags").select("id").eq("id", bagId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
