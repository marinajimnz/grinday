import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("starts with a BOM so Excel keeps the accents", () => {
    const csv = toCsv([{ notes: "café con eñe" }]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain("café con eñe");
  });

  it("separates rows with CRLF", () => {
    expect(toCsv([{ a: 1 }, { a: 2 }])).toBe(`${BOM}a\r\n1\r\n2`);
  });

  it("quotes cells with commas, quotes and either kind of line break", () => {
    const csv = toCsv([{ a: 'dulce, "redondo"', b: "una\nlínea", c: "otra\rlínea" }]);
    expect(csv).toBe(`${BOM}a,b,c\r\n"dulce, ""redondo""","una\nlínea","otra\rlínea"`);
  });

  it("defuses text that a spreadsheet would run as a formula", () => {
    const csv = toCsv([{ a: "=HYPERLINK(\"x\")", b: "+1", c: "-amargo", d: "@SUM(A1)" }]);
    expect(csv).toBe(`${BOM}a,b,c,d\r\n"'=HYPERLINK(""x"")",'+1,'-amargo,'@SUM(A1)`);
  });

  it("leaves negative numbers as numbers", () => {
    expect(toCsv([{ a: -1.5 }])).toBe(`${BOM}a\r\n-1.5`);
  });

  it("writes null and undefined as empty cells, and joins arrays", () => {
    expect(toCsv([{ a: null, b: undefined, c: ["fresa", "cacao"] }])).toBe(`${BOM}a,b,c\r\n,,fresa; cacao`);
  });

  it("is just the BOM when there is nothing to export", () => {
    expect(toCsv([])).toBe(BOM);
  });
});
