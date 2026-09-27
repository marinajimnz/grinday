import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parseProfileKind } = await import("@/features/profile/publicQueries");

describe("parseProfileKind", () => {
  it("maps the ?tipo filter to a search kind", () => {
    expect(parseProfileKind("personas")).toBe("person");
    expect(parseProfileKind("tostadoras")).toBe("roaster");
  });

  it("falls back to everything for anything else", () => {
    expect(parseProfileKind(undefined)).toBe("all");
    expect(parseProfileKind("")).toBe("all");
    expect(parseProfileKind("otra-cosa")).toBe("all");
  });
});
