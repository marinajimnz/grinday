import { test, expect } from "./fixtures";
import { createCoffeeComplete } from "./helpers";

async function logRatedAttempt(
  page: import("@playwright/test").Page,
  coffeeBagId: string,
  rating: string,
) {
  await page.goto(`/attempts/new?coffeeBagId=${coffeeBagId}`);
  await page.getByLabel("Molido").fill("12");
  await page.getByLabel("Segundos de molienda").fill("14.8");
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Tamaño").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");
  await page.getByLabel("Tiempo de extracción (ms)").fill("28000");
  await page
    .getByRole("radiogroup", { name: "Puntuación general" })
    .getByRole("radio", { name: rating })
    .click();
  await page.getByRole("button", { name: "Guardar intento" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
}

test("dashboard shows the active coffee and stats aggregate once there's enough rated history", async ({
  page,
  testUser,
}) => {
  void testUser;
  const name = `Stats Coffee ${Date.now()}`;

  // No equipment setup here on purpose: /attempts/new asks for a bag, not a
  // machine (brew_attempts.machine_id became optional in 0019), so a brand-new
  // account can log one straight away. This used to open with a "pick a
  // default machine" step against a /settings/machines that offered a
  // catalogue of models; the 0020 equipment rework replaced that page with
  // grinder/method cards, and the step had been failing ever since.

  await createCoffeeComplete(page, { name, roaster: "E2E Stats Roaster", country: "Colombia" });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  await page.getByRole("tab", { name: "Bolsas" }).click();
  await expect(page.getByText("Sin abrir")).toBeVisible();
  const bagId = await page.locator("[data-bag-id]").first().getAttribute("data-bag-id");
  if (!bagId) throw new Error("Expected a bag panel with data-bag-id");

  // Below the n>=3 threshold: the page-level empty state must show.
  await logRatedAttempt(page, bagId, "4");
  await page.goto("/stats");
  await expect(page.getByText("Puntúa tus próximos intentos", { exact: false })).toBeVisible();

  await logRatedAttempt(page, bagId, "5");
  await logRatedAttempt(page, bagId, "3");

  // Dashboard: all three attempts show up under "Preparaciones recientes",
  // newest first. This used to assert a single "café activo" card with
  // "Último intento: #3"; that card is gone — the dashboard lists the recent
  // attempts instead, so the coffee's name now appears once per row and the
  // old single-element locator was matching three.
  await page.goto("/");
  const recentRows = page.getByRole("link", { name: new RegExp(name) });
  await expect(recentRows).toHaveCount(3);
  await expect(recentRows.first()).toBeVisible();

  // Stats: 3 rated attempts clears the threshold. The page-level empty
  // state is gone (this test only fills country and roaster, so the
  // process/roast_level/notes cards legitimately still show their own
  // per-card "insuficiente" — that's correct, not asserted away here).
  await page.goto("/stats");
  await expect(page.getByText("Puntúa tus próximos intentos", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Top cafés" })).toBeVisible();
  await expect(page.getByText(name, { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Por tostador" })).toBeVisible();
  await expect(page.getByText("E2E Stats Roaster")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Distribución de extracción" })).toBeVisible();
  await expect(page.getByText("28 s")).toBeVisible();

  // A date range that excludes every attempt falls back to "insuficiente".
  await page.getByLabel("Desde").fill("2099-01-01");
  await expect(page.getByText("Puntúa tus próximos intentos", { exact: false })).toBeVisible();
});
