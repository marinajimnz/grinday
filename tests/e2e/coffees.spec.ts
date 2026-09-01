import { test, expect } from "@playwright/test";

test("creates a coffee manually and finds it in the library", async ({ page }) => {
  const name = `Test Coffee ${Date.now()}`;

  await page.goto("/coffees/new");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Tostador").fill("E2E Roaster");
  await page.getByLabel("País").fill("Colombia");
  await page.getByRole("button", { name: "Guardar café" }).click();

  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // The bag status lives under the "Bolsas" tab (added in Fase 2).
  await page.getByRole("tab", { name: "Bolsas" }).click();
  await expect(page.getByText("Sin abrir")).toBeVisible();

  await page.goto(`/coffees?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(name)).toBeVisible();
});

test("offers to reuse an existing coffee when name+roaster match", async ({ page }) => {
  const name = `Dup Coffee ${Date.now()}`;

  await page.goto("/coffees/new");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Tostador").fill("E2E Roaster");
  await page.getByRole("button", { name: "Guardar café" }).click();
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  await page.goto("/coffees/new");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Tostador").fill("E2E Roaster");
  await page.getByRole("button", { name: "Guardar café" }).click();

  await expect(page.getByText(`Ya tienes “${name}”`, { exact: false })).toBeVisible();
});
