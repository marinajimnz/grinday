import { describe, expect, it } from "vitest";
import type { Factor } from "@supabase/supabase-js";
import { assuranceLevelOf, needsMfaStepUp } from "@/lib/supabase/mfa";

function token(claims: Record<string, unknown>) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(claims)}.signature`;
}

const verified = { id: "f1", status: "verified", factor_type: "totp" } as Factor;
const unverified = { id: "f2", status: "unverified", factor_type: "totp" } as Factor;

describe("assuranceLevelOf", () => {
  it("reads the aal claim", () => {
    expect(assuranceLevelOf(token({ aal: "aal2" }))).toBe("aal2");
    expect(assuranceLevelOf(token({ aal: "aal1" }))).toBe("aal1");
  });

  it("is null for a missing claim or a token that isn't one", () => {
    expect(assuranceLevelOf(token({ sub: "x" }))).toBeNull();
    expect(assuranceLevelOf(undefined)).toBeNull();
    expect(assuranceLevelOf("not-a-jwt")).toBeNull();
    expect(assuranceLevelOf("a.%%%.c")).toBeNull();
  });
});

describe("needsMfaStepUp", () => {
  it("asks a password-only session for its code once a factor is verified", () => {
    expect(needsMfaStepUp({ factors: [verified] }, "aal1")).toBe(true);
    expect(needsMfaStepUp({ factors: [verified] }, null)).toBe(true);
  });

  it("lets through a session that already passed the second factor", () => {
    expect(needsMfaStepUp({ factors: [verified] }, "aal2")).toBe(false);
  });

  it("leaves accounts without a verified factor alone", () => {
    expect(needsMfaStepUp({ factors: [] }, "aal1")).toBe(false);
    expect(needsMfaStepUp({ factors: undefined }, "aal1")).toBe(false);
    expect(needsMfaStepUp({ factors: [unverified] }, "aal1")).toBe(false);
    expect(needsMfaStepUp(null, null)).toBe(false);
  });
});
