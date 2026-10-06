import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  // What an attacker would send: a Host pointing at their own site.
  headers: async () => new Headers({ host: "evil.example", "x-forwarded-host": "evil.example" }),
}));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => "es" }));
vi.mock("@/lib/siteUrl", () => ({ siteUrl: () => siteUrlValue }));
let siteUrlValue: string | null = "https://grinday.vercel.app";
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { resetPasswordForEmail } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "user-1" } }) }) }),
    }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: "marina@example.com" } } }) } },
  }),
}));

const { requestPasswordResetAction } = await import("@/features/auth/actions");

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    siteUrlValue = "https://grinday.vercel.app";
  });

  it("links to the app's own address, whatever Host the request claims", async () => {
    await requestPasswordResetAction("marina");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("marina@example.com", {
      redirectTo: "https://grinday.vercel.app/reset-password",
    });
  });

  it("sends nothing rather than guess when there's no address configured", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    siteUrlValue = null;
    expect(await requestPasswordResetAction("marina")).toEqual({ success: true });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
