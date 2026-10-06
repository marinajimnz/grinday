import "server-only";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireEnv } from "@/lib/env";

type Admin = SupabaseClient<Database>;

// Failed sign-ins allowed per window, counted separately for what was typed
// in the identifier field and for the IP it came from. The identifier limit
// protects one account from guessing; the IP limit stops one machine from
// working through many accounts. Generous enough that a person who forgot
// their password never meets them.
export const WINDOW_MS = 15 * 60 * 1000;
export const LIMITS = { identifier: 10, ip: 30 } as const;

// Keyed hashes, not the values: the table shouldn't hold the emails people
// type, and an unkeyed hash of an IPv4 address is reversible by brute force.
function hash(value: string) {
  const secret = requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function throttleKeys(identifier: string, ip: string | null) {
  return {
    identifier: `id:${hash(identifier.trim().toLowerCase())}`,
    ip: ip ? `ip:${hash(ip)}` : null,
  };
}

/** The client's IP as the platform reports it — first hop of x-forwarded-for. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}

async function failuresSince(admin: Admin, key: string, since: string) {
  const { count, error } = await admin
    .from("login_failures")
    .select("key", { count: "exact", head: true })
    .eq("key", key)
    .gt("failed_at", since);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Whether this sign-in should be refused before it's even tried. Fails
 * open: if the count can't be read — the migration not applied yet, the
 * database briefly unreachable — signing in still works, as it did before
 * this existed, rather than nobody being able to.
 */
export async function isThrottled(admin: Admin, keys: ReturnType<typeof throttleKeys>, now = Date.now()) {
  const since = new Date(now - WINDOW_MS).toISOString();
  try {
    if ((await failuresSince(admin, keys.identifier, since)) >= LIMITS.identifier) return true;
    if (keys.ip && (await failuresSince(admin, keys.ip, since)) >= LIMITS.ip) return true;
    return false;
  } catch (error) {
    console.error("[login] throttle check failed, letting the sign-in through", error);
    return false;
  }
}

/** Counts one failed sign-in against both keys, and drops rows too old to matter. */
export async function recordFailure(admin: Admin, keys: ReturnType<typeof throttleKeys>, now = Date.now()) {
  const rows = [{ key: keys.identifier }, ...(keys.ip ? [{ key: keys.ip }] : [])];
  const { error } = await admin.from("login_failures").insert(rows);
  if (error) console.error("[login] couldn't record a failed sign-in", error);
  await admin
    .from("login_failures")
    .delete()
    .lt("failed_at", new Date(now - 24 * 60 * 60 * 1000).toISOString());
}

/** A successful sign-in wipes that identifier's slate; the IP's count stays. */
export async function clearFailures(admin: Admin, keys: ReturnType<typeof throttleKeys>) {
  await admin.from("login_failures").delete().eq("key", keys.identifier);
}
