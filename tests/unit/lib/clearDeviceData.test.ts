import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDeviceData } from "@/lib/clearDeviceData";

describe("clearDeviceData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("drops the cached pages and the offline snapshot, and keeps the rest", async () => {
    const names = ["serwist-precache-v2-https://grinday.app/", "others", "next-data", "apis"];
    const deleted: string[] = [];
    vi.stubGlobal("caches", {
      keys: async () => names,
      delete: async (name: string) => (deleted.push(name), true),
    });
    localStorage.setItem("grinday:dashboard-snapshot", '{"coffeeName":"La Esperanza"}');
    localStorage.setItem("grinday:theme", "dark");
    localStorage.setItem("grinday:brew-draft:d-1", '{"userId":"user-1"}');

    await clearDeviceData();

    // The app's own files stay — they're nobody's data.
    expect(deleted.sort()).toEqual(["apis", "next-data", "others"]);
    expect(localStorage.getItem("grinday:dashboard-snapshot")).toBeNull();
    expect(localStorage.getItem("grinday:theme")).toBe("dark");
    // A draft may hold a brew that hasn't synced yet.
    expect(localStorage.getItem("grinday:brew-draft:d-1")).not.toBeNull();
  });

  it("never fails signing out because a cache wouldn't clear", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("caches", { keys: async () => Promise.reject(new Error("nope")) });
    await expect(clearDeviceData()).resolves.toBeUndefined();
  });
});
