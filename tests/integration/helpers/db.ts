// Integration tests talk to the real linked Supabase database over a direct
// Postgres connection — the same project the app and tests/e2e use — but
// every test runs inside a transaction that is always rolled back. Users are
// inserted straight into auth.users inside that transaction, so nothing a
// test creates (accounts, profiles, moderation rows) ever outlives it, and no
// fixture account with a known password has to exist in production.
//
// Requests are impersonated the way PostgREST does it: `set local role
// authenticated` plus the JWT claims in `request.jwt.claims`, so grants, RLS
// and auth.uid()/auth.jwt() behave exactly as they do behind the REST API.
//
// DRY_RUN_MIGRATION=supabase/migrations/00xx_name.sql runs that file at the
// start of every transaction first — a way to test a migration against the
// real schema before `npm run db:push`, with nothing left behind.
import postgres, { type Sql, type TransactionSql } from "postgres";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
    for (const line of lines) {
      const i = line.indexOf("=");
      if (i === -1) continue;
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    // fall through to process.env (e.g. CI with real env vars already set)
  }
  return env;
}

function connectionString(): string {
  const env = { ...loadEnv(), ...process.env };
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;

  // `supabase link` leaves the pooler URL (without password) behind.
  const poolerFile = resolve(process.cwd(), "supabase/.temp/pooler-url");
  const password = env.SUPABASE_DB_PASSWORD;
  if (!existsSync(poolerFile) || !password) {
    throw new Error(
      "Integration tests need SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD plus a linked project (npx supabase link).",
    );
  }
  const url = new URL(readFileSync(poolerFile, "utf8").trim());
  url.password = password;
  return url.toString();
}

let client: Sql | null = null;

export function db(): Sql {
  client ??= postgres(connectionString(), {
    max: 1,
    onnotice: () => {},
    prepare: false,
  });
  return client;
}

export async function closeDb() {
  await client?.end();
  client = null;
}

class Rollback extends Error {}

/** Runs `fn` in a transaction that is rolled back no matter what. */
export async function withRollback(fn: (tx: TransactionSql) => Promise<void>): Promise<void> {
  const migration = process.env.DRY_RUN_MIGRATION;
  try {
    await db().begin(async (tx) => {
      // This is the production database. A test that dies or hangs
      // mid-transaction must never sit on locks the app needs: the server
      // ends an idle open transaction, a lock wait or a runaway statement
      // on its own within seconds. Set here, per transaction, because the
      // Supabase pooler drops these when passed as connection parameters.
      await tx`set local idle_in_transaction_session_timeout = '15s'`;
      await tx`set local lock_timeout = '5s'`;
      await tx`set local statement_timeout = '20s'`;
      if (migration) {
        await tx.unsafe(readFileSync(resolve(process.cwd(), migration), "utf8"));
      }
      await fn(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

export type TestUser = { id: string; email: string };

/** Creates an auth user (and, through handle_new_user, its profile). */
export async function createUser(
  tx: TransactionSql,
  profile: { role?: "admin" | "coffee_lover"; display_name?: string } = {},
): Promise<TestUser> {
  const id = randomUUID();
  const email = `integration-${id}@grinday.test`;
  await tx`
    insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, now(), now())
  `;
  if (profile.role || profile.display_name) {
    await tx`
      update public.profiles
      set role = coalesce(${profile.role ?? null}, role),
          display_name = coalesce(${profile.display_name ?? null}, display_name)
      where id = ${id}
    `;
  }
  return { id, email };
}

/**
 * Switches the rest of the transaction to `user`'s identity as PostgREST
 * would see it, until the next asUser/asService call. `aal` is the
 * authenticator assurance level the session claims: aal2 means the user
 * passed a second factor.
 */
export async function asUser(tx: TransactionSql, user: TestUser, aal: "aal1" | "aal2" = "aal1") {
  const claims = JSON.stringify({ sub: user.id, role: "authenticated", aal, email: user.email });
  await tx`select set_config('request.jwt.claims', ${claims}, true)`;
  await tx`set local role authenticated`;
}

/** Back to the connection's own (owner) role, e.g. to inspect results. */
export async function asService(tx: TransactionSql) {
  await tx`reset role`;
  await tx`select set_config('request.jwt.claims', '', true)`;
}

/**
 * Runs `query` inside a savepoint and returns the Postgres error code it
 * failed with, or null if it succeeded — so a test can assert a denial
 * without the error aborting the whole transaction.
 */
export async function errorCode(
  tx: TransactionSql,
  query: (sp: TransactionSql) => Promise<unknown>,
): Promise<string | null> {
  try {
    await tx.savepoint(async (sp) => {
      await query(sp);
    });
    return null;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (!code) throw error;
    return code;
  }
}
