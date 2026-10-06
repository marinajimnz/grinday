import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const BUCKET = "coffee-photos";
const PAGE = 1000;

// Every file in the bucket under one folder, at any depth. Storage lists a
// folder at a time; an entry without an id is a subfolder.
async function listFiles(admin: SupabaseClient<Database>, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw error;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) paths.push(...(await listFiles(admin, path)));
      else paths.push(path);
    }
    if (data.length < PAGE) break;
  }
  return paths;
}

/**
 * Removes every photo an account ever uploaded. They all live under the
 * account's own folder ({userId}/…, which is also what the Storage policies
 * key on), so the folder is the whole list — including draft photos no row
 * ever pointed at. Returns how many went.
 */
export async function removeUserFiles(admin: SupabaseClient<Database>, userId: string): Promise<number> {
  const paths = await listFiles(admin, userId);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
  return paths.length;
}
