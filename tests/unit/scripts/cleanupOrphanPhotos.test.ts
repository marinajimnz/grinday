import { describe, expect, it } from "vitest";
import { findOrphans } from "../../../scripts/cleanup-orphan-photos.mjs";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const file = (path: string, daysOld: number) => ({
  path,
  createdAt: new Date(NOW - daysOld * DAY).toISOString(),
  size: 1000,
});

describe("findOrphans", () => {
  const referenced = new Set(["u1/bag-1/1.jpg", "u1/attempts/a-1/2.jpg", "u1/attempts/drafts/d-1/3.jpg"]);

  it("keeps every file a row still points at, however old", () => {
    const files = [file("u1/bag-1/1.jpg", 400), file("u1/attempts/a-1/2.jpg", 400), file("u1/attempts/drafts/d-1/3.jpg", 400)];
    expect(findOrphans(files, referenced, NOW, 30 * DAY)).toEqual([]);
  });

  it("finds an old file nothing points at — a deleted attempt's photo", () => {
    const gone = file("u1/attempts/a-deleted/4.jpg", 90);
    expect(findOrphans([gone], referenced, NOW, 30 * DAY)).toEqual([gone]);
  });

  it("leaves a recent unreferenced file alone: it may be a draft still being brewed", () => {
    const draft = file("u1/attempts/drafts/d-open/5.jpg", 3);
    expect(findOrphans([draft], referenced, NOW, 30 * DAY)).toEqual([]);
  });
});
