// Excel only reads a CSV as UTF-8 when it starts with a byte-order mark;
// without one, every accent in a Spanish note comes out as "Ã©".
const BOM = "﻿";

// A cell starting with one of these is a formula to Excel, Numbers and
// Sheets — "=HYPERLINK(...)" in a tasting note would run on open. A
// leading quote makes it text again, which is what OWASP recommends.
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  // Only strings can be formulas: a negative number like -1 has to stay a
  // number in the spreadsheet.
  if (typeof v === "string" && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return BOM;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  // CRLF is what RFC 4180 specifies and what Excel writes itself.
  return BOM + lines.join("\r\n");
}
