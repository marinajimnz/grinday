import { test, expect } from "./fixtures";
import { ensurePublicProfileFixture } from "./profileFixture";
import { ensurePrivateProfileFixture } from "./searchFixture";

test("finds a profile by its exact handle", async ({ page, testUser }) => {
  void testUser;
  const { username } = await ensurePublicProfileFixture();

  await page.goto(`/search?q=${encodeURIComponent(username)}`);
  await expect(page.getByText(`@${username}`, { exact: true })).toBeVisible();
});

test("finds a profile by a partial name match", async ({ page, testUser }) => {
  void testUser;
  const { username } = await ensurePublicProfileFixture();

  // "Perfil Público E2E" is the fixture's display_name — search a prefix.
  await page.goto(`/search?q=${encodeURIComponent("Perfil Público")}`);
  await expect(page.getByText(`@${username}`, { exact: true })).toBeVisible();
});

test("never shows a non-public profile in results", async ({ page, testUser }) => {
  void testUser;
  const { username } = await ensurePrivateProfileFixture();

  await page.goto(`/search?q=${encodeURIComponent(username)}`);
  await expect(page.getByText(`@${username}`, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Perfil Privado E2E")).toHaveCount(0);
});
