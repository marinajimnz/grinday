import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("server-only", () => ({}));
let locale: "es" | "en" = "es";
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => locale }));

const { fail } = await import("@/lib/i18n/serverErrors");

describe("fail", () => {
  it("answers in the account's language", async () => {
    locale = "es";
    expect(await fail("unauthenticated")).toEqual({ success: false, message: es.errors.server.unauthenticated });
    locale = "en";
    expect(await fail("unauthenticated")).toEqual({ success: false, message: en.errors.server.unauthenticated });
  });

  it("keeps the database's own message out of the answer, and in the log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = { message: 'duplicate key value violates unique constraint "coffees_pkey"' };

    const result = await fail("generic", cause);

    expect(result.message).not.toContain("coffees_pkey");
    expect(log).toHaveBeenCalledWith("[action] generic", cause);
    log.mockRestore();
  });
});
