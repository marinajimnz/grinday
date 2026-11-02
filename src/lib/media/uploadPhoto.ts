import type { SupabaseClient } from "@supabase/supabase-js";
import { compressImage } from "./compressImage";
import { THUMBNAIL_MAX_DIMENSION, THUMBNAIL_QUALITY, thumbnailPathFor } from "./thumbnail";

const BUCKET = "coffee-photos";

/**
 * Uploads a photo and its tile copy (see thumbnail.ts) to `path`. The
 * original has to make it, so its failure throws; the copy is best-effort,
 * and `hasThumbnail` reports whether it did, for the media row to record.
 */
export async function uploadPhoto(
  supabase: SupabaseClient,
  path: string,
  file: File,
): Promise<{ hasThumbnail: boolean }> {
  const [original, thumbnail] = await Promise.all([
    compressImage(file),
    compressImage(file, { maxDimension: THUMBNAIL_MAX_DIMENSION, quality: THUMBNAIL_QUALITY }),
  ]);

  const { error } = await supabase.storage.from(BUCKET).upload(path, original, { contentType: "image/jpeg" });
  if (error) throw error;

  // compressImage hands back the file untouched when it can't read it as an
  // image; a "copy" that is the original at full size would be no copy.
  if (thumbnail === file) return { hasThumbnail: false };
  const { error: thumbnailError } = await supabase.storage
    .from(BUCKET)
    .upload(thumbnailPathFor(path), thumbnail, { contentType: "image/jpeg" });
  if (thumbnailError) console.error("[photo] failed to upload the tile copy:", thumbnailError.message);
  return { hasThumbnail: !thumbnailError };
}
