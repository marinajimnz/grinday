import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

test("logs an attempt, marks it preferred, duplicates it, and compares both", async ({
  page,
  testUser,
}) => {
  void testUser;
  const name = `Attempt Coffee ${Date.now()}`;

  // No equipment setup here on purpose: /attempts/new asks for a bag, not a
  // machine (brew_attempts.machine_id became optional in 0019), so a brand-new
  // account can log one straight away. This used to open with a "pick a
  // default machine" step against a /settings/machines that offered a
  // catalogue of models; the 0020 equipment rework replaced that page with
  // grinder/method cards, and the step had been failing ever since.

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
