// Integration test against the real linked Supabase project, reusing the
// persistent test-fixture users. cloneRecipeAction's "can I clone this?"
// guard is exactly "can I SELECT this brew_attempts row" — RLS
// (brew_attempts_select_public) is what actually decides that, so this
// exercises the guard at that layer rather than the "use server" action
// itself (which needs a Next.js request context Vitest doesn't have).
//
// Uses a dedicated "c" fixture (permanently is_public = false, same
// account tests/e2e/searchFixture.ts sets up) for the private-profile
// case instead of toggling test-fixture-a's own is_public — flipping a
// flag shared with other suites (e.g. rls.test.ts) running concurrently
// against the same account caused exactly the flaky cross-file failure
// that pattern is meant to avoid.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, getTestUser, type TestFixtureUser } from "../../helpers/testUsers";

describe("clone recipe eligibility (Fase 12)", () => {
  let userA: TestFixtureUser;
  let userB: TestFixtureUser;
  let userC: TestFixtureUser;
  let coffeeId: string;
  let attemptId: string;
  let privateCoffeeId: string;
  let privateAttemptId: string;

  beforeAll(async () => {
    userA = await getTestUser("a");
    userB = await getTestUser("b");
    userC = await getTestUser("c");

    await admin.from("profiles").update({ is_public: false }).eq("id", userC.id);

    const { data: machine, error: machineModelError } = await admin
      .from("machine_models")
      .select("id")
      .eq("slug", "sage-barista-express-impress")
      .single();
    if (machineModelError || !machine) throw machineModelError ?? new Error("seed machine model not found");
    const machineModelId = machine.id;

    async function seedAttempt(user: TestFixtureUser, coffeeName: string) {
      const { data: userMachine, error: machineErr } = await user.client
        .from("user_machines")
        .insert({ user_id: user.id, machine_model_id: machineModelId })
        .select("id")
        .single();
      if (machineErr || !userMachine) throw machineErr ?? new Error("no user_machine");

      const { data: coffee, error: coffeeErr } = await user.client
        .from("coffees")
        .insert({ user_id: user.id, name: coffeeName, roaster: "Test Roaster" })
        .select("id")
        .single();
      if (coffeeErr || !coffee) throw coffeeErr ?? new Error("no coffee");

      const { data: bag, error: bagErr } = await user.client
        .from("coffee_bags")
        .insert({ coffee_id: coffee.id, user_id: user.id })
        .select("id")
        .single();
      if (bagErr || !bag) throw bagErr ?? new Error("no bag");

      const { data: attempt, error: attemptErr } = await user.client
        .from("brew_attempts")
        .insert({
          user_id: user.id,
          coffee_id: coffee.id,
          coffee_bag_id: bag.id,
          machine_id: userMachine.id,
          dose_g: 18,
        })
        .select("id")
        .single();
      if (attemptErr || !attempt) throw attemptErr ?? new Error("no attempt");

      return { coffeeId: coffee.id, attemptId: attempt.id };
    }

    ({ coffeeId, attemptId } = await seedAttempt(userA, "Clone eligibility coffee"));
    ({ coffeeId: privateCoffeeId, attemptId: privateAttemptId } = await seedAttempt(
      userC,
      "Clone eligibility private coffee",
    ));
  });

  afterAll(async () => {
    await admin.from("coffees").delete().eq("id", coffeeId);
    await admin.from("coffees").delete().eq("id", privateCoffeeId);
  });

  it("lets B read a public attempt as the basis for cloning", async () => {
    const { data, error } = await userB.client
      .from("brew_attempts")
      .select("id")
      .eq("id", attemptId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(attemptId);
  });

  it("can't clone a nonexistent attempt", async () => {
    const { data, error } = await userB.client
      .from("brew_attempts")
      .select("id")
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("can't clone an attempt whose owner's profile isn't public", async () => {
    const { data, error } = await userB.client
      .from("brew_attempts")
      .select("id")
      .eq("id", privateAttemptId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
