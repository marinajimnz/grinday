import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { backupSchema } from "@/features/backup/plan";
import { importBackup } from "@/features/backup/importBackup";

// Far beyond any real journal's export (a thousand attempts is about 2 MB),
// and small enough that nobody can make the server parse something huge.
const MAX_BYTES = 10 * 1024 * 1024;

// The other half of /api/export: POST the JSON file it produced.
// ?dryRun=1 reports what would be added without writing anything.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // A cross-site form can't send this content type without a CORS
  // preflight, which this route never answers — so only the app's own
  // fetch reaches the import with the user's cookies.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "invalid_file" }, { status: 415 });
  }

  const text = await request.text();
  if (text.length > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  try {
    const counts = await importBackup(supabase, user.id, parsed.data, { dryRun });
    return NextResponse.json({ counts });
  } catch (error) {
    console.error("[import] failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
