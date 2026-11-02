// Every photo in the app is shown as a tile (a gallery square, a 48px
// picker icon), never at full size, yet the tiles used to load the
// 1600px original. Each upload now also stores a small copy beside it, at
// a path derived from the original's, and the media row's has_thumbnail
// says whether that copy exists. Photos from before it, or whose copy
// failed to upload, have it false and keep showing the original.
//
// Plain module (no server-only, no browser APIs): the uploader, the server
// queries and the deletes all derive the same path from here.

/** Longest side of the tile copy. A tile is at most ~200 CSS px, so this
 *  stays sharp on a 2x screen and is a fraction of the original's size. */
export const THUMBNAIL_MAX_DIMENSION = 480;
export const THUMBNAIL_QUALITY = 0.78;

/** `{folder}/{name}.jpg` → `{folder}/{name}.thumb.jpg`. */
export function thumbnailPathFor(storagePath: string): string {
  return storagePath.replace(/(\.[^./]+)?$/, ".thumb.jpg");
}

/** The paths to remove from Storage for these photos: each one and its tile
 *  copy. Removing a copy that was never made is a no-op. */
export function withThumbnails(storagePaths: string[]): string[] {
  return storagePaths.flatMap((path) => [path, thumbnailPathFor(path)]);
}

/** The path a tile should load: the copy when there is one. */
export function tilePathFor(media: { storage_path: string; has_thumbnail?: boolean | null }): string {
  return media.has_thumbnail ? thumbnailPathFor(media.storage_path) : media.storage_path;
}
