// Makes the tile copy (see src/lib/media/thumbnail.ts) for photos uploaded
// before copies existed, and marks their rows has_thumbnail. Until it runs,
// those photos simply keep showing the original, so it's safe to run at any
// time, and again: it only looks at rows still without a copy.
//
// Read-only unless --apply is passed: it lists what it would do and changes
// nothing. Needs migration 0056 applied first.
//
//   npm run backfill:thumbnails              # report only
//   npm run backfill:thumbnails -- --apply   # actually make them
//
// The resizing is done by sharp, which Next.js already installs for its own
// image optimisation.
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { thumbnailPathFor } from "./cleanup-orphan-photos.mjs";

const BUCKET = "coffee-photos";
const PAGE = 1000;
// Same as THUMBNAIL_MAX_DIMENSION and THUMBNAIL_QUALITY in thumbnail.ts.
const MAX_DIMENSION = 480;
const QUALITY = 78;

function loadEnvLocal() {
  try {
    const lines = readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n");
    for (const line of lines) {
      const i = line.indexOf("=");
      if (i === -1) continue;
      const key = line.slice(0, i).trim();
      if (key && !(key in process.env)) process.env[key] = line.slice(i + 1).trim();
    }
  } catch {
    // no .env.local — fall back to the environment
  }
}

async function rowsWithoutThumbnail(supabase, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select("id, storage_path")
      .eq("has_thumbnail", false)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[backfill-thumbnails] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let made = 0;
  let failed = 0;
  for (const table of ["coffee_media", "attempt_media"]) {
    const rows = await rowsWithoutThumbnail(supabase, table);
    console.log(`[backfill-thumbnails] ${table}: ${rows.length} photos without a tile copy.`);
    if (!apply) continue;

    for (const row of rows) {
      try {
        const { data: original, error: downloadError } = await supabase.storage.from(BUCKET).download(row.storage_path);
        if (downloadError) throw downloadError;
        const thumbnail = await sharp(Buffer.from(await original.arrayBuffer()))
          .rotate()
          .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: QUALITY })
          .toBuffer();
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(thumbnailPathFor(row.storage_path), thumbnail, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw uploadError;
        const { error: updateError } = await supabase.from(table).update({ has_thumbnail: true }).eq("id", row.id);
        if (updateError) throw updateError;
        made++;
      } catch (error) {
        // One photo that can't be read (its file already gone, say) keeps
        // showing the original; it shouldn't stop the rest.
        failed++;
        console.error(`  ${row.storage_path}: ${error.message ?? error}`);
      }
    }
  }

  if (!apply) {
    console.log("[backfill-thumbnails] Nothing changed. Run again with --apply to make them.");
    return;
  }
  console.log(`[backfill-thumbnails] Made ${made} tile copies, ${failed} failed.`);
}

await main();
