import { beforeEach, describe, expect, it, vi } from "vitest";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => "es" }));

const calls: string[] = [];
const state = {
  profile: { username: "marina" as string | null, role: "coffee_lover" },
  signInError: null as unknown,
  deleteError: null as unknown,
  removeFails: false,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1", email: "marina@example.com" } } }),
      signInWithPassword: async () => ({ error: state.signInError }),
      signOut: async (opts: unknown) => calls.push(`signOut:${JSON.stringify(opts)}`),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: state.profile }) }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        deleteUser: async (id: string) => (calls.push(`deleteUser:${id}`), { error: state.deleteError }),
      },
    },
  }),
}));
vi.mock("@/features/account/removeUserFiles", () => ({
  removeUserFiles: async (_: unknown, id: string) => {
    calls.push(`removeUserFiles:${id}`);
    if (state.removeFails) throw new Error("storage down");
    return 3;
  },
}));

const { deleteAccountAction } = await import("@/features/account/actions");

describe("deleteAccountAction", () => {
  beforeEach(() => {
    calls.length = 0;
    state.profile = { username: "marina", role: "coffee_lover" };
    state.signInError = null;
    state.deleteError = null;
    state.removeFails = false;
  });

  it("deletes the account, then its photos, then the session", async () => {
    expect(await deleteAccountAction({ confirmation: "Marina ", password: "secret" })).toEqual({ success: true });
    expect(calls).toEqual(["deleteUser:user-1", "removeUserFiles:user-1", 'signOut:{"scope":"local"}']);
  });

  it("asks for the email when the account has no username", async () => {
    state.profile = { username: null, role: "coffee_lover" };
    expect((await deleteAccountAction({ confirmation: "marina", password: "secret" })).success).toBe(false);
    expect((await deleteAccountAction({ confirmation: "marina@example.com", password: "secret" })).success).toBe(true);
  });

  it("refuses when the confirmation doesn't match, without touching anything", async () => {
    expect(await deleteAccountAction({ confirmation: "someone", password: "secret" })).toEqual({
      success: false,
      message: es.settings.deleteAccountMismatch,
    });
    expect(calls).toEqual([]);
  });

  it("refuses a wrong password, without touching anything", async () => {
    state.signInError = { message: "Invalid login credentials" };
    expect(await deleteAccountAction({ confirmation: "marina", password: "nope" })).toEqual({
      success: false,
      message: es.settings.currentPasswordIncorrect,
    });
    expect(calls).toEqual([]);
  });

  it("never deletes an admin account", async () => {
    state.profile = { username: "admin", role: "admin" };
    expect(await deleteAccountAction({ confirmation: "admin", password: "secret" })).toEqual({
      success: false,
      message: es.settings.deleteAccountAdmin,
    });
    expect(calls).toEqual([]);
  });

  it("keeps the photos if the account itself couldn't be deleted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.deleteError = { message: "boom" };
    expect((await deleteAccountAction({ confirmation: "marina", password: "secret" })).success).toBe(false);
    expect(calls).toEqual(["deleteUser:user-1"]);
  });

  it("still reports success when only the photo cleanup fails — the account is gone", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.removeFails = true;
    expect(await deleteAccountAction({ confirmation: "marina", password: "secret" })).toEqual({ success: true });
    expect(calls.at(-1)).toBe('signOut:{"scope":"local"}');
  });
});
