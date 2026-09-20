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

  // One attempt, no cup count recorded — the manual form doesn't ask — so
  // the period reads it as the one cup it must have been. The page opens on
  // the week, which is where an attempt logged a second ago lands.
  await logRatedAttempt(page, bagId, "4");
  await page.goto("/stats");
  await expect(page.getByText("Tu semana en café")).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("taza preparada")).toBeVisible();

  await logRatedAttempt(page, bagId, "5");
  await logRatedAttempt(page, bagId, "3");

  // Dashboard: all three attempts show up under "Intentos recientes",
  // newest first. This used to assert a single "café activo" card with
  // "Último intento: #3"; that card is gone — the dashboard lists the recent
  // attempts instead, so the coffee's name now appears once per row and the
  // old single-element locator was matching three.
  await page.goto("/");
  const recentRows = page.getByRole("link", { name: new RegExp(name) });
  await expect(recentRows).toHaveCount(3);
  await expect(recentRows.first()).toBeVisible();

  // The count leads the page and needs no ratings at all: three brews,
  // three cups, whatever they scored.
  await page.goto("/stats");
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("tazas preparadas")).toBeVisible();

  // The breakdowns are behind their own headings now, and stay closed
  // until asked — that's the point of the redesign, so the count isn't
  // buried under six lists you didn't come for.
  const topCoffees = page.getByRole("button", { name: "Top cafés" });
  await expect(topCoffees).toHaveAttribute("aria-expanded", "false");
  // Checked by the panel's own caption, not by the coffee's name: the name
  // is up in the highlights too ("Mejor puntuación", "Café más repetido"),
  // so its absence would never have meant the panel was shut.
  await expect(page.getByText("Por puntuación media", { exact: false })).toHaveCount(0);

  await topCoffees.click();
  await expect(topCoffees).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Por puntuación media", { exact: false })).toBeVisible();
  await expect(page.getByText(name, { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "Por tostador" }).click();
  await expect(page.getByText("E2E Stats Roaster")).toBeVisible();

  await page.getByRole("button", { name: "Distribución de extracción" }).click();
  await expect(page.getByText("28 s")).toBeVisible();

  // Switching period re-cuts everything: the three brews were logged just
  // now, so they're in this year too — and the year is the one heading that
  // carries its own label, so this also checks the eyebrow's year suffix.
  await page.getByRole("tab", { name: "Año" }).click();
  await expect(
    page.getByText(new RegExp(`Tu año en café · ${new Date().getFullYear()}`, "i")),
  ).toBeVisible();
  await expect(page.getByText("tazas preparadas")).toBeVisible();
});
