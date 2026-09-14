// Integration test against the real linked Supabase project, same pattern
// as tests/unit/features/profile/rls.test.ts: reuses the persistent
// test-fixture users and only cleans up the follow row it creates, not the
// accounts. Exercises the `follows` table directly (server actions need a
// Next.js request context for cookies() that Vitest doesn't have).
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { admin, getTestUser, type TestFixtureUser } from "../../helpers/testUsers";

describe("follows (Fase 10)", () => {
  let userA: TestFixtureUser;
  let userB: TestFixtureUser;

  beforeAll(async () => {
    userA = await getTestUser("a");
    userB = await getTestUser("b");
  });

  afterEach(async () => {
    await admin
      .from("follows")
      .delete()
      .eq("follower_id", userA.id)
      .eq("followee_id", userB.id);
  });

  it("can't follow yourself", async () => {
    const { error } = await userA.client
      .from("follows")
      .insert({ follower_id: userA.id, followee_id: userA.id });
    expect(error).not.toBeNull();
  });

  it("following twice doesn't duplicate the row", async () => {
    const first = await userA.client
      .from("follows")
      .insert({ follower_id: userA.id, followee_id: userB.id });
    expect(first.error).toBeNull();

    const second = await userA.client
      .from("follows")
      .insert({ follower_id: userA.id, followee_id: userB.id });
    expect(second.error).not.toBeNull();

    const { count } = await admin
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userA.id)
      .eq("followee_id", userB.id);
    expect(count).toBe(1);
  });

  it("unfollowing deletes the row", async () => {
    await userA.client.from("follows").insert({ follower_id: userA.id, followee_id: userB.id });

    const { error: deleteError } = await userA.client
      .from("follows")
      .delete()
      .eq("follower_id", userA.id)
      .eq("followee_id", userB.id);
    expect(deleteError).toBeNull();

    const { count } = await admin
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userA.id)
      .eq("followee_id", userB.id);
    expect(count).toBe(0);
  });
});
