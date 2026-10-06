import "server-only";
import type { Dictionary } from "./dictionaries/es";
import { getDictionary } from "./get-dictionary";
import { getLocale } from "./locale";

export type ServerErrorKey = keyof Dictionary["errors"]["server"];

/**
 * A failed action's answer, in the account's language. Server actions used
 * to return fixed Spanish strings — and, for database failures, Postgres's
 * own message, in English and naming tables — straight to the form. Now
 * the form gets a sentence it can show, and `cause`, when there is one, goes
 * to the server log where it's actually useful.
 */
export async function fail(key: ServerErrorKey, cause?: unknown): Promise<{ success: false; message: string }> {
  if (cause) console.error(`[action] ${key}`, cause);
  const dict = getDictionary(await getLocale());
  return { success: false, message: dict.errors.server[key] };
}
