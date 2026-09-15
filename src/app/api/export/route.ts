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

  // RLS scopes every one of these to the calling user automatically — no
  // explicit .eq("user_id", ...) needed, same guarantee as everywhere else.
  const [{ data: coffees }, { data: bags }, { data: attempts }] = await Promise.all([
    supabase.from("coffees").select("*").order("created_at"),
    supabase.from("coffee_bags").select("*").order("created_at"),
    supabase.from("brew_attempts").select("*").order("created_at"),
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
