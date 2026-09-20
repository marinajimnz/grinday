import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

// The one thing the two bag forms genuinely don't share, now that they
// compose the same fields: a bag being created can only be sealed or open,
// so its status is derived from the opened date and shown, not asked; a bag
// being edited may already be finished or archived — states no date field
// can express — so it keeps a picker. BagStatusField holds both and the
// caller says which, which is exactly the kind of flag that gets passed
// wrong and goes unnoticed.
test.setTimeout(120_000);

test("a new bag's status is derived, an existing bag's is chosen", async ({ page, testUser }) => {
  void testUser;
  await createCoffeeBasic(page, { name: `Estado ${Date.now()}` });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  const coffeeUrl = page.url();

  await page.getByRole("tab", { name: "Bolsas" }).click();
  await page.getByRole("button", { name: "Añadir bolsa" }).click();
  await expect(page.getByLabel("Fecha de tueste")).toBeVisible();

  // Derived: a read-only line saying "Sin abrir", and no way to pick.
  await expect(page.locator("p#bag\\.status")).toHaveText("Sin abrir");
  await expect(page.locator("select#bag\\.status")).toHaveCount(0);
  // And it follows the opened date rather than sitting there.
  await page.getByLabel("Fecha de apertura").fill("2026-09-01");
  await expect(page.locator("p#bag\\.status")).toHaveText("Abierta");

  // The bag that already exists keeps the picker — it lives behind
  // "Editar" inside the expanded bag, not in the accordion itself.
  await page.goto(coffeeUrl);
  await page.getByRole("tab", { name: "Bolsas" }).click();
  // The accordion, not the "Añadir bolsa" button that precedes it.
  await page.locator("button[data-bag-id]").first().click();
  await page.locator("[data-bag-id]").getByRole("button", { name: "Editar" }).first().click();
  await expect(page.getByLabel("Fecha de tueste")).toBeVisible();
  await expect(page.locator("select#bag\\.status")).toHaveCount(1);
  await expect(page.locator("p#bag\\.status")).toHaveCount(0);
  // All four bag statuses are offered, including the two a date can't say.
  await expect(page.locator("select#bag\\.status option")).toHaveCount(4);
});
