import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

vi.mock("server-only", () => ({}));
const { removeUserFiles } = await import("@/features/account/removeUserFiles");

// A bucket as nested folders: a folder entry has no id, a file has one.
const tree: Record<string, { name: string; id: string | null }[]> = {
  "user-1": [
    { name: "bag-1", id: null },
    { name: "attempts", id: null },
  ],
  "user-1/bag-1": [{ name: "1.jpg", id: "f1" }],
  "user-1/attempts": [
    { name: "a-1", id: null },
    { name: "drafts", id: null },
  ],
  "user-1/attempts/a-1": [{ name: "2.jpg", id: "f2" }],
  "user-1/attempts/drafts": [{ name: "d-1", id: null }],
  "user-1/attempts/drafts/d-1": [{ name: "3.jpg", id: "f3" }],
};

describe("removeUserFiles", () => {
  it("removes every file under the account's folder, drafts included", async () => {
    const removed: string[] = [];
    const admin = {
      storage: {
        from: () => ({
          list: async (prefix: string) => ({ data: tree[prefix] ?? [], error: null }),
          remove: async (paths: string[]) => (removed.push(...paths), { error: null }),
        }),
      },
    } as unknown as SupabaseClient<Database>;

    expect(await removeUserFiles(admin, "user-1")).toBe(3);
    expect(removed.sort()).toEqual([
      "user-1/attempts/a-1/2.jpg",
      "user-1/attempts/drafts/d-1/3.jpg",
      "user-1/bag-1/1.jpg",
    ]);
  });
});
