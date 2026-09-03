import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

test("logs an attempt, marks it preferred, duplicates it, and compares both", async ({
  page,
  testUser,
}) => {
  void testUser;
  const name = `Attempt Coffee ${Date.now()}`;

  // Fresh guest session: pick a default machine first (Fase 0 onboarding step).
  await page.goto("/settings/machines");
  await page.getByRole("button", { name: "Usar como predeterminada" }).click();
  await expect(page.getByText("Predeterminada")).toBeVisible();

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  await page.getByRole("link", { name: "Registrar manual" }).click();
  await expect(page).toHaveURL(/\/attempts\/new/);

  await page.getByLabel("Molido").fill("12");
  await page.getByLabel("Segundos de molienda").fill("14.8");
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Tamaño").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");
  await page.getByRole("button", { name: "Guardar intento" }).click();

  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Intento #1" })).toBeVisible();

  await page.getByRole("button", { name: "Marcar como preferido" }).click();
  await expect(page.getByRole("button", { name: "Quitar de preferido" })).toBeVisible();

  await page.getByRole("link", { name: "Duplicar y ajustar" }).click();
  await expect(page).toHaveURL(/\/attempts\/new/);
  await expect(page.getByText("Partiendo del intento #1", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Molido")).toHaveValue("12");

  await page.getByLabel("Segundos de molienda").fill("15.2");
  await page.getByRole("button", { name: "Guardar intento" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Intento #2" })).toBeVisible();

  const coffeeLink = page.getByRole("link", { name: /E2E Roaster/ });
  await coffeeLink.click();
  await expect(page.getByText("Receta preferida")).toBeVisible();

  const checkboxes = page.locator('input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await page.getByRole("button", { name: /Comparar/ }).click();

  await expect(page).toHaveURL(/\/compare\?ids=/);
  await expect(page.getByText("#1")).toBeVisible();
  await expect(page.getByText("#2")).toBeVisible();
});
