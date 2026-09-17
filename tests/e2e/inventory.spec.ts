import { test, expect } from "./fixtures";
import { createCoffeeComplete } from "./helpers";

test("tracks inventory automatically for approximate_shots and never shows negative", async ({
  page,
  testUser,
}) => {
  void testUser;
  const name = `Inventory Coffee ${Date.now()}`;

  // No equipment setup here on purpose: /attempts/new asks for a bag, not a
  // machine (brew_attempts.machine_id became optional in 0019), so a brand-new
  // account can log one straight away. This used to open with a "pick a
  // default machine" step against a /settings/machines that offered a
  // catalogue of models; the 0020 equipment rework replaced that page with
  // grinder/method cards, and the step had been failing ever since.

  await createCoffeeComplete(page, {
    name,
    packageWeightG: "250",
    inventoryMode: "approximate_shots",
    estimatedDoseG: "18",
  });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  // The "Bolsas" tab shows a compact card per bag; clicking it expands the
  // full detail inline — no more navigating to a separate /bags/[id] page
  // from here.
  await page.getByRole("tab", { name: "Bolsas" }).click();

  const bagCard = page.locator("[data-bag-id]").first();
  const bagId = await bagCard.getAttribute("data-bag-id");
  if (!bagId) throw new Error("Expected a bag panel with data-bag-id");
  await bagCard.click();

  // 250g / 18g = 13 shots, labeled as an approximation.
  await expect(page.getByText("aprox. 13 shots", { exact: false })).toBeVisible();

  // Log an attempt against this bag — should auto-deduct one dose (18g).
  await page.goto(`/attempts/new?coffeeBagId=${bagId}`);
  await page.getByLabel("Molido").fill("12");
  await page.getByLabel("Segundos de molienda").fill("14.8");
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Tamaño").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");
  await page.getByRole("button", { name: "Guardar intento" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);

  await page.goto(`/bags/${bagId}`);
  await expect(page.getByText("aprox. 12 shots", { exact: false })).toBeVisible();

  // Manual adjustment: correct down to a small amount, then verify it never
  // reads negative even after another consumption exceeds it.
  await page.getByRole("button", { name: "Ajustar inventario" }).click();
  await page.getByLabel("Cantidad restante actual (g)").fill("10");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("aprox. 0 shots", { exact: false })).toBeVisible();

  await page.goto(`/attempts/new?coffeeBagId=${bagId}`);
  await page.getByLabel("Molido").fill("12");
  await page.getByLabel("Segundos de molienda").fill("14.8");
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Tamaño").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");
  await page.getByRole("button", { name: "Guardar intento" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);

  await page.goto(`/bags/${bagId}`);
  await expect(page.getByText(/-\d/)).toHaveCount(0); // never a negative figure
  await expect(page.getByText("aprox. 0 shots", { exact: false })).toBeVisible();

  await page.goto("/inventory");
  await expect(page.getByText(name)).toBeVisible();
});
