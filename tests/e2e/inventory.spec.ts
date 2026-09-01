import { test, expect } from "@playwright/test";

test("tracks inventory automatically for approximate_shots and never shows negative", async ({
  page,
}) => {
  const name = `Inventory Coffee ${Date.now()}`;

  // Fresh guest session: pick a default machine first (Fase 0 onboarding step).
  await page.goto("/settings/machines");
  await page.getByRole("button", { name: "Usar como predeterminada" }).click();
  await expect(page.getByText("Predeterminada")).toBeVisible();

  await page.goto("/coffees/new");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Tostador").fill("E2E Roaster");
  await page.getByLabel("Peso del paquete (g)").fill("250");
  await page.getByLabel("Inventario").selectOption("approximate_shots");
  await page.getByLabel("Dosis estimada (g)").fill("18");
  await page.getByRole("button", { name: "Guardar café" }).click();
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  await page.getByRole("tab", { name: "Bolsas" }).click();
  await page.getByText("Sin abrir").click();

  // 250g / 18g = 13 shots, labeled as an approximation.
  await expect(page.getByText("aprox. 13 shots", { exact: false })).toBeVisible();

  const bagUrl = page.url();
  const bagId = bagUrl.split("/bags/")[1];

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
