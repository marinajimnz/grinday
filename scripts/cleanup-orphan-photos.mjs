// Finds photos in the coffee-photos bucket that nothing points at any more,
// and with --delete removes them. They come from before deleting an attempt
// also deleted its photos: the cascade took the attempt_media rows and left
// the files, unreachable from the app but still stored.
//
// A file counts as orphaned when no coffee_media or attempt_media row names
// it AND it's older than ORPHAN_MIN_AGE_DAYS (30 by default). The age matters:
// a brew's photo step uploads under {user}/attempts/drafts/{draft}/ before the
// attempt exists, and that draft lives only in someone's browser — it can be
// resumed days later, and until it's saved no row points at its photos. So a
// recent unreferenced file may well be in use; an old one isn't.
//
// Read-only unless --delete is passed: it lists what it found, how many and
// how much space, and changes nothing. Deleting can't be undone.
//
//   npm run cleanup:photos              # report only
//   npm run cleanup:photos -- --delete  # actually delete
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BUCKET = "coffee-photos";
const PAGE = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The orphans among `files`: not in `referenced`, and created before
 * `now - minAgeMs`. Pure, so the rule can be tested without Storage.
 */
export function findOrphans(files, referenced, now, minAgeMs) {
  return files.filter((file) => !referenced.has(file.path) && now - Date.parse(file.createdAt) > minAgeMs);
}

// Storage lists one folder at a time; entries without an id are folders.
async function listAllFiles(supabase, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw error;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...(await listAllFiles(supabase, path)));
      else if (entry.name !== ".emptyFolderPlaceholder")
        files.push({ path, createdAt: entry.created_at, size: entry.metadata?.size ?? 0 });
    }
    if (data.length < PAGE) break;
  }
  return files;
}

async function listReferencedPaths(supabase) {
  const referenced = new Set();
  for (const table of ["coffee_media", "attempt_media"]) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select("storage_path")
        .order("storage_path")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      for (const row of data) referenced.add(row.storage_path);
      if (data.length < PAGE) break;
    }
  }
  return referenced;
}

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

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[cleanup-orphan-photos] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const shouldDelete = process.argv.includes("--delete");
  const minAgeDays = Number(process.env.ORPHAN_MIN_AGE_DAYS ?? 30);
  if (!Number.isFinite(minAgeDays) || minAgeDays < 1) {
    console.error("[cleanup-orphan-photos] ORPHAN_MIN_AGE_DAYS must be a number of days, 1 or more.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // References first, files second: a photo registered in between is then
  // in the reference list before its file could be listed as unreferenced.
  const referenced = await listReferencedPaths(supabase);
  const files = await listAllFiles(supabase);
  const orphans = findOrphans(files, referenced, Date.now(), minAgeDays * DAY_MS);

  const megabytes = (orphans.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1);
  console.log(
    `[cleanup-orphan-photos] ${files.length} files, ${referenced.size} referenced, ` +
      `${orphans.length} orphaned and older than ${minAgeDays} days (${megabytes} MB).`,
  );
  for (const orphan of orphans.slice(0, 20)) console.log(`  ${orphan.createdAt}  ${orphan.path}`);
  if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`);

  if (!orphans.length) return;
  if (!shouldDelete) {
    console.log("[cleanup-orphan-photos] Nothing deleted. Run again with --delete to remove them.");
    return;
  }

  let removed = 0;
  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100).map((f) => f.path);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`[cleanup-orphan-photos] failed after removing ${removed}:`, error.message);
      process.exit(1);
    }
    removed += batch.length;
  }
  console.log(`[cleanup-orphan-photos] Deleted ${removed} files.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
