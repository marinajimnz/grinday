import { beforeEach, describe, expect, it, vi } from "vitest";
import es from "@/lib/i18n/dictionaries/es";

const signInWithPassword = vi.fn();
const profiles = new Map([["marina", "user-1"]]);
const emails = new Map([["user-1", "marina@example.com"]]);

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => "es" }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, username: string) => ({
          maybeSingle: async () => ({ data: profiles.has(username) ? { id: profiles.get(username) } : null }),
        }),
      }),
    }),
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: { email: emails.get(id) } } }),
      },
    },
  }),
}));

const actions = await import("@/features/auth/actions");

describe("loginAction", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signInWithPassword.mockResolvedValue({ error: null });
  });

  it("signs in by username on the server, without returning the email", async () => {
    const result = await actions.loginAction("Marina", "secret");

    expect(signInWithPassword).toHaveBeenCalledWith({ email: "marina@example.com", password: "secret" });
    expect(result).toEqual({ success: true });
    expect(JSON.stringify(result)).not.toContain("@");
  });

  it("uses an email as it is", async () => {
    await actions.loginAction("someone@example.com", "secret");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "someone@example.com", password: "secret" });
  });

  it("answers an unknown username exactly like a wrong password", async () => {
    const unknown = await actions.loginAction("nobody", "secret");
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const wrong = await actions.loginAction("marina", "nope");

    expect(unknown).toEqual({ success: false, message: es.login.error });
    expect(wrong).toEqual(unknown);
  });

  it("asks for an identifier when there is none", async () => {
    expect(await actions.loginAction("  ", "secret")).toEqual({
      success: false,
      message: es.login.identifierRequired,
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("no longer exposes a way to look an email up", () => {
    expect(actions).not.toHaveProperty("resolveLoginEmailAction");
  });
});
