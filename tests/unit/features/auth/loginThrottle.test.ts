import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

vi.mock("server-only", () => ({}));
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";

const { LIMITS, WINDOW_MS, clearFailures, clientIp, isThrottled, recordFailure, throttleKeys } = await import(
  "@/features/auth/loginThrottle"
);

type Row = { key: string; failed_at: string };

// The three things the throttle asks of the table: count recent rows for a
// key, insert rows, delete by key or by age.
function fakeAdmin(rows: Row[], { broken = false } = {}) {
  const admin = {
    from: () => ({
      select: () => {
        const filters: ((r: Row) => boolean)[] = [];
        const q = {
          eq: (_: string, key: string) => (filters.push((r) => r.key === key), q),
          gt: (_: string, since: string) => (filters.push((r) => r.failed_at > since), q),
          then: (resolve: (v: unknown) => void) =>
            resolve(broken ? { count: null, error: { message: 'relation "login_failures" does not exist' } } : { count: rows.filter((r) => filters.every((f) => f(r))).length, error: null }),
        };
        return q;
      },
      insert: async (newRows: { key: string }[]) => {
        for (const r of newRows) rows.push({ key: r.key, failed_at: new Date().toISOString() });
        return { error: null };
      },
      delete: () => ({
        eq: async (_: string, key: string) => {
          rows.splice(0, rows.length, ...rows.filter((r) => r.key !== key));
        },
        lt: async (_: string, before: string) => {
          rows.splice(0, rows.length, ...rows.filter((r) => r.failed_at >= before));
        },
      }),
    }),
  };
  return admin as unknown as SupabaseClient<Database>;
}

const keys = throttleKeys("Marina@Example.com ", "203.0.113.7");
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

describe("throttleKeys", () => {
  it("stores neither the identifier nor the IP as typed", () => {
    expect(keys.identifier).not.toContain("marina");
    expect(keys.ip).not.toContain("203.0.113.7");
  });

  it("treats the same identifier the same however it's written", () => {
    expect(throttleKeys("marina@example.com", null).identifier).toBe(keys.identifier);
  });
});

describe("clientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers())).toBeNull();
  });
});

describe("isThrottled", () => {
  let rows: Row[];
  beforeEach(() => {
    rows = [];
  });

  it("lets sign-ins through under the limit", async () => {
    for (let i = 0; i < LIMITS.identifier - 1; i++) rows.push({ key: keys.identifier, failed_at: minutesAgo(1) });
    expect(await isThrottled(fakeAdmin(rows), keys)).toBe(false);
  });

  it("refuses an identifier with too many recent failures", async () => {
    for (let i = 0; i < LIMITS.identifier; i++) rows.push({ key: keys.identifier, failed_at: minutesAgo(1) });
    expect(await isThrottled(fakeAdmin(rows), keys)).toBe(true);
  });

  it("refuses an IP working through many accounts", async () => {
    for (let i = 0; i < LIMITS.ip; i++) rows.push({ key: keys.ip!, failed_at: minutesAgo(1) });
    expect(await isThrottled(fakeAdmin(rows), keys)).toBe(true);
  });

  it("forgets failures older than the window", async () => {
    const old = minutesAgo(WINDOW_MS / 60_000 + 1);
    for (let i = 0; i < LIMITS.identifier; i++) rows.push({ key: keys.identifier, failed_at: old });
    expect(await isThrottled(fakeAdmin(rows), keys)).toBe(false);
  });

  it("fails open when the table can't be read, so nobody is locked out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await isThrottled(fakeAdmin(rows, { broken: true }), keys)).toBe(false);
  });
});

describe("recordFailure and clearFailures", () => {
  it("counts against both keys, and a success clears only the identifier", async () => {
    const rows: Row[] = [];
    const admin = fakeAdmin(rows);
    await recordFailure(admin, keys);
    expect(rows.map((r) => r.key).sort()).toEqual([keys.identifier, keys.ip].sort());

    await clearFailures(admin, keys);
    expect(rows.map((r) => r.key)).toEqual([keys.ip]);
  });

  it("drops rows older than a day while it's at it", async () => {
    const rows: Row[] = [{ key: "id:old", failed_at: minutesAgo(25 * 60) }];
    await recordFailure(fakeAdmin(rows), keys);
    expect(rows.some((r) => r.key === "id:old")).toBe(false);
  });
});
