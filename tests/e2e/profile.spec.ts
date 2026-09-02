import { test, expect } from "./fixtures";

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
