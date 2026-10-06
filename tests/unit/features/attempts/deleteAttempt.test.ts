import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => "es" }));

const remove = vi.fn();
let deleteResult: { data: unknown; error: unknown };
const photos = [{ storage_path: "user-1/attempt-1/a.jpg" }, { storage_path: "user-1/attempt-1/b.jpg" }];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) =>
      table === "attempt_media"
        ? { select: () => ({ eq: async () => ({ data: photos, error: null }) }) }
        : { delete: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => deleteResult }) }) }) },
    storage: { from: () => ({ remove }) },
  }),
}));

const { deleteAttemptAction } = await import("@/features/attempts/actions");

describe("deleteAttemptAction", () => {
  beforeEach(() => {
    remove.mockReset();
    remove.mockResolvedValue({ error: null });
  });

  it("deletes the attempt's photos from Storage, not just their rows", async () => {
    deleteResult = { data: { coffee_id: "coffee-1" }, error: null };

    expect(await deleteAttemptAction("attempt-1")).toEqual({ success: true, data: undefined });
    expect(remove).toHaveBeenCalledWith(["user-1/attempt-1/a.jpg", "user-1/attempt-1/b.jpg"]);
  });

  it("keeps the photos when the attempt couldn't be deleted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleteResult = { data: null, error: { message: "boom" } };

    expect((await deleteAttemptAction("attempt-1")).success).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps them too when there was no such attempt to delete", async () => {
    deleteResult = { data: null, error: null };
    await deleteAttemptAction("someone-elses-attempt");
    expect(remove).not.toHaveBeenCalled();
  });
});
