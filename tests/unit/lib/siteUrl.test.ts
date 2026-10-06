import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { siteUrl } = await import("@/lib/siteUrl");

describe("siteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_SITE_URL first, without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://grindaily.coffee/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "grinday.vercel.app");
    expect(siteUrl()).toBe("https://grindaily.coffee");
  });

  it("falls back to Vercel's production domain", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "grinday.vercel.app");
    expect(siteUrl()).toBe("https://grinday.vercel.app");
  });

  it("is localhost in development, and nothing anywhere else", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(siteUrl()).toBe("http://localhost:3000");
    vi.stubEnv("NODE_ENV", "production");
    expect(siteUrl()).toBeNull();
  });
});
