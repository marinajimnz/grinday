import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("; ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  // coffees/brew_attempts got a public-read RLS policy in Fase 8 (public
  // profiles) — RLS alone no longer scopes these to just the calling user,
  // so this export needs its own explicit filter. coffee_bags stayed
  // owner-only, but filtering it too costs nothing and removes any future
  // reliance on that staying true.
  const [{ data: coffees }, { data: bags }, { data: attempts }] = await Promise.all([
    supabase.from("coffees").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("coffee_bags").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("brew_attempts").select("*").eq("user_id", user.id).order("created_at"),
  ]);

  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = toCsv(attempts ?? []);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="grinday-intentos-${stamp}.csv"`,
      },
    });
  }

  const body = JSON.stringify(
    { exported_at: new Date().toISOString(), coffees, coffee_bags: bags, brew_attempts: attempts },
    null,
    2,
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="grinday-export-${stamp}.json"`,
    },
  });
}
