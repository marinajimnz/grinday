import { test, expect } from "./fixtures";
import { ensurePublicProfileFixture } from "./profileFixture";

test("shows the admin role and saves a new display name", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings/profile");

  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  await expect(page.getByText("Admin")).toBeVisible();

  await page.getByLabel("Nombre").fill("Marina");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Nombre")).toHaveValue("Marina");
});

test("rejects an empty display name", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings/profile");

  await page.getByLabel("Nombre").fill("   ");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Escribe un nombre")).toBeVisible();
});

test("shows another user's public profile, read-only", async ({ page, testUser }) => {
  void testUser;
  const { username, coffeeName } = await ensurePublicProfileFixture();

  await page.goto(`/u/${username}`);

  await expect(page.getByText(`@${username}`)).toBeVisible();
  // The coffee's name legitimately appears twice (its own card, and again
  // in the recent-attempts row for the seeded attempt) — scope to the card.
  await expect(page.getByRole("article").getByText(coffeeName)).toBeVisible();

  // No owner-only actions leak into a stranger's view of this profile.
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archivar" })).toHaveCount(0);
});

test("404s for a username that doesn't exist", async ({ page, testUser }) => {
  void testUser;
  // Next dev doesn't surface notFound() as an HTTP 404 on the navigation
  // response the way a production build does — assert on the rendered
  // not-found UI instead, which is what actually matters here.
  await page.goto("/u/this-username-does-not-exist-e2e");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
});
