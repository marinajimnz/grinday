import { test, expect } from "./fixtures";
import { createCoffeeBasic, createCoffeeComplete } from "./helpers";

test("creates a coffee manually and finds it in the library", async ({ page, testUser }) => {
  void testUser;
  const name = `Test Coffee ${Date.now()}`;

  await createCoffeeComplete(page, { name, country: "Colombia" });

  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // The bag status lives under the "Bolsas" tab (added in Fase 2).
  await page.getByRole("tab", { name: "Bolsas" }).click();
  await expect(page.getByText("Sin abrir")).toBeVisible();

  await page.goto(`/coffees?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(name)).toBeVisible();
});

test("offers to reuse an existing coffee when name+roaster match", async ({ page, testUser }) => {
  void testUser;
  const name = `Dup Coffee ${Date.now()}`;

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  // The duplicate check runs right after name + roaster, i.e. the first
  // coffee step in either mode — no need to finish the wizard to see it.
  await page.goto("/coffees/new");
  await page.getByRole("button", { name: "Básico" }).click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Tostador").fill("E2E Roaster");
  await page.getByRole("button", { name: "Siguiente" }).click();

  await expect(page.getByText(`Ya tienes “${name}”`, { exact: false })).toBeVisible();
});
