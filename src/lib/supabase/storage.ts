import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { tilePathFor } from "@/lib/media/thumbnail";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

// Every photo is shown as a tile, so the URL is for the tile copy when the
// row has one (lib/media/thumbnail.ts) and for the original otherwise.
export async function attachSignedUrls<T extends { storage_path: string; has_thumbnail?: boolean | null }>(
  supabase: SupabaseClient<Database>,
  media: T[],
  bucket = "coffee-photos",
): Promise<(T & { url: string | null })[]> {
  if (!media.length) return [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(
      media.map(tilePathFor),
      SIGNED_URL_TTL_SECONDS,
    );
  if (error) {
    console.error(`[storage] failed to sign URLs in bucket "${bucket}":`, error.message);
    return media.map((m) => ({ ...m, url: null }));
  }
  const urlByPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return media.map((m) => ({ ...m, url: urlByPath.get(tilePathFor(m)) ?? null }));
}
