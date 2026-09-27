// A fixed picture of everything that decides what one account can reach of
// another's data: every RLS policy, every function a client can execute,
// and every table-level privilege clients hold. Any change to that surface
// — a new policy, a new callable function, a new grant — fails this test
// until the snapshot is updated on purpose (`npm run test:integration -- -u`)
// and the diff is read in review. That's the point: nothing starts being
// shared by accident.
import { afterAll, expect, it } from "vitest";
import { closeDb, withRollback } from "./helpers/db";

afterAll(closeDb);

it("matches the reviewed exposure surface", async () => {
  await withRollback(async (tx) => {
    const policies = await tx`
      select tablename, policyname, cmd, roles::text[] as roles, qual, with_check
      from pg_policies
      where schemaname in ('public', 'storage')
      order by schemaname, tablename, policyname
    `;

    const functions = await tx`
      select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
             p.prosecdef as security_definer,
             array(
               select r from unnest(array['anon', 'authenticated']) r
               where has_function_privilege(r, p.oid, 'execute')
             ) as callable_by
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
      order by signature
    `;

    const tables = await tx`
      select c.relname as table,
             c.relrowsecurity as rls,
             array(
               select r || ':' || priv
               from unnest(array['anon', 'authenticated']) r,
                    unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) priv
               where has_table_privilege(r, c.oid, priv)
               order by 1
             ) as table_grants,
             array(
               select a.attname || ':' || priv
               from pg_attribute a,
                    unnest(array['SELECT', 'INSERT', 'UPDATE']) priv
               where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                 and has_column_privilege('authenticated', c.oid, a.attnum, priv)
                 and not has_table_privilege('authenticated', c.oid, priv)
               order by 1
             ) as authenticated_column_grants
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
      order by c.relname
    `;

    const surface = {
      policies: [...policies],
      functions: [...functions],
      tables: [...tables],
    };
    await expect(JSON.stringify(surface, null, 2) + "\n").toMatchFileSnapshot(
      "./__snapshots__/exposure-surface.json",
    );
  });
});
