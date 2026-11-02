import { describe, expect, it } from "vitest";
import { thumbnailPathFor, tilePathFor, withThumbnails } from "@/lib/media/thumbnail";
import { thumbnailPathFor as scriptThumbnailPathFor } from "../../../scripts/cleanup-orphan-photos.mjs";

describe("photo tile copies", () => {
  it("puts the copy beside the original", () => {
    expect(thumbnailPathFor("user-1/bag-1/1700000000000.jpg")).toBe("user-1/bag-1/1700000000000.thumb.jpg");
    expect(thumbnailPathFor("user-1/attempts/drafts/d.1/170.jpg")).toBe("user-1/attempts/drafts/d.1/170.thumb.jpg");
    // A dot in a folder name isn't an extension.
    expect(thumbnailPathFor("user-1/d.1/photo")).toBe("user-1/d.1/photo.thumb.jpg");
  });

  it("removes each photo together with its copy", () => {
    expect(withThumbnails(["a/1.jpg", "a/2.jpg"])).toEqual(["a/1.jpg", "a/1.thumb.jpg", "a/2.jpg", "a/2.thumb.jpg"]);
  });

  it("loads the copy only when the row says there is one", () => {
    expect(tilePathFor({ storage_path: "a/1.jpg", has_thumbnail: true })).toBe("a/1.thumb.jpg");
    expect(tilePathFor({ storage_path: "a/1.jpg", has_thumbnail: false })).toBe("a/1.jpg");
    expect(tilePathFor({ storage_path: "a/1.jpg" })).toBe("a/1.jpg");
  });

  it("matches the rule the orphan cleanup script keeps its own copy of", () => {
    for (const path of ["u/b/1.jpg", "u/d.1/x", "u/a/b.c.jpg"]) {
      expect(scriptThumbnailPathFor(path)).toBe(thumbnailPathFor(path));
    }
  });
});
