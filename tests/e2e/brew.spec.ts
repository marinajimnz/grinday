import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

test("guided brew: mise en place, timer, post-shot form, and espresso photo section", async ({
  page,
  testUser,
}) => {
  void testUser;
  const name = `Brew Coffee ${Date.now()}`;

  // Fresh guest session: pick a default machine first (Fase 0 onboarding step).
  await page.goto("/settings/machines");
  await page.getByRole("button", { name: "Usar como predeterminada" }).click();
  await expect(page.getByText("Predeterminada")).toBeVisible();

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  await page.goto("/brew/new");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/brew\/live\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Mise en place: bump the steppers a few times each.
  await page.getByRole("button", { name: "Aumentar Molido" }).click({ clickCount: 3 });
  await page.getByRole("button", { name: "Aumentar Molienda (s)" }).click({ clickCount: 2 });
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Cesta").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");

  await page.getByRole("button", { name: "Iniciar temporizador" }).click();
  await expect(page.getByRole("button", { name: "Parar" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Parar" }).click();

  // Review / post-shot phase.
  await expect(page.getByText("Extracción")).toBeVisible();
  const extractionText = await page.locator("text=/\\d+\\.\\ds/").first().textContent();
  expect(Number(extractionText?.replace("s", ""))).toBeGreaterThan(0.5);

  await page.getByLabel("Presión observada").selectOption("espresso_range");
  const overallRating = page.getByRole("radiogroup", { name: "Puntuación general" });
  await overallRating.getByRole("radio", { name: "4" }).click();
  await page.getByLabel("Notas").fill("Dulce, buen crema.");

  await page.getByRole("button", { name: "Guardar intento" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Intento #1" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Fotos del espresso" })).toBeVisible();
});
