import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function attachSignedUrls<T extends { storage_path: string }>(
  supabase: SupabaseClient<Database>,
  media: T[],
  bucket = "coffee-photos",
): Promise<(T & { url: string | null })[]> {
  if (!media.length) return [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(
      media.map((m) => m.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );
  if (error) {
    console.error(`[storage] failed to sign URLs in bucket "${bucket}":`, error.message);
    return media.map((m) => ({ ...m, url: null }));
  }
  const urlByPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return media.map((m) => ({ ...m, url: urlByPath.get(m.storage_path) ?? null }));
}
