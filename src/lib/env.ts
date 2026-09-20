/**
 * The four Supabase clients used to read their configuration as
 * `process.env.X!` — an assertion that says "this is always set" while
 * doing nothing to make it true. When it isn't set, Supabase is handed
 * `undefined` and fails somewhere inside itself, with a message about a
 * URL rather than about the variable nobody defined.
 *
 * There was a zod-schema version of this file, but nothing ever imported
 * it, so it never validated anything. This is the same guard without the
 * schema: the check has to be reachable from the browser bundle and from
 * middleware, and a schema in either of those is weight for a string test.
 *
 * Takes the value, not just the name: bundlers inline `process.env.NEXT_PUBLIC_*`
 * per literal reference, so reading it dynamically would come back
 * undefined on the client — which is exactly the failure this is here to
 * prevent.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Defínela en .env.local (desarrollo) o en la configuración del despliegue.`,
    );
  }
  return value;
}
