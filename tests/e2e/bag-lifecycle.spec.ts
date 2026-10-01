import { test, expect } from "./fixtures";
import { createCoffeeBasic, createCoffeeComplete } from "./helpers";

test.setTimeout(120_000);

test("finishing a bag dates it, counts its cups, and sinks the coffee down the list", async ({
  page,
  testUser,
}) => {
  void testUser;
  const stamp = Date.now();
  // Two coffees, oldest first: the library is ordered by most recently
  // touched, so `second` sits above `first` until something changes.
  const first = `Primero ${stamp}`;
  const second = `Segundo ${stamp}`;

  await createCoffeeBasic(page, { name: first });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  await createCoffeeComplete(page, { name: second, roaster: "Tostador E2E", country: "Colombia" });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  await page.getByRole("tab", { name: "Bolsas" }).click();
  const bagId = await page.locator("[data-bag-id]").first().getAttribute("data-bag-id");
  if (!bagId) throw new Error("Expected a bag panel with data-bag-id");

  // Two brews from this bag. The manual form records no cup count, so each
  // one counts as the single cup it must have been.
  for (const ms of ["28000", "30000"]) {
    await page.goto(`/attempts/new?coffeeBagId=${bagId}`);
    await page.getByLabel("Molido").fill("12");
    await page.getByLabel("Segundos de molienda").fill("14.8");
    await page.getByLabel("Tiempo de extracción (ms)").fill(ms);
    await page.getByRole("button", { name: "Guardar intento" }).click();
    await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  }

  // Before: the newer coffee leads the library.
  await page.goto("/coffees");
  const names = page.getByRole("link", { name: new RegExp(`(${first}|${second})`) });
  await expect(names.first()).toContainText(second);

  const bag = page.locator(`[data-bag-id="${bagId}"]`);
  await page.goto(`/bags/${bagId}`);

  // The count is there before the bag is finished — it is what the bag has
  // poured so far, not a closing ceremony.
  await expect(bag.getByText("Tazas")).toBeVisible();
  await expect(bag.locator("dd").filter({ hasText: "aprox." })).toContainText("2");
  // Exact: getByText matches substrings case-insensitively, and the button
  // that does the finishing says "Marcar como terminada".
  await expect(bag.getByText("Terminada", { exact: true })).toHaveCount(0);

  // All three actions have to be reachable, and on a 390px phone they do not
  // fit on one row — 208 + 86 + 140px of button against 318px of card. Delete
  // was off the right edge entirely once, and then dangling alone beside a
  // gap. Checked by geometry rather than by eye: every button inside the card,
  // and edit and delete sharing a line.
  const card = await bag.boundingBox();
  if (!card) throw new Error("Expected the bag card to have a box");
  const boxes: Record<string, { x: number; y: number; width: number }> = {};
  for (const name of ["Marcar como terminada", "Editar", "Eliminar bolsa"]) {
    const box = await page.getByRole("button", { name }).first().boundingBox();
    if (!box) throw new Error(`Expected "${name}" to have a box`);
    expect(box.x).toBeGreaterThanOrEqual(card.x);
    expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 1);
    boxes[name] = box;
  }
  expect(boxes["Editar"].y).toBe(boxes["Eliminar bolsa"].y);

  // One tap: no trip through the edit form's status picker, and no date to
  // remember to fill in underneath it.
  await page.getByRole("button", { name: "Marcar como terminada" }).click();
  await expect(bag.getByText("Terminada", { exact: true })).toBeVisible();

  // The finish date is today, written by the app rather than typed.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await page.getByRole("button", { name: "Editar" }).first().click();
  await expect(page.locator("input#bag\\.finishedAt")).toHaveValue(today);
  await page.getByRole("button", { name: "Cancelar" }).first().click();

  // After: nothing left to brew, so the coffee drops below the one that
  // still has a bag — even though it was touched more recently.
  await page.goto("/coffees");
  await expect(names.first()).toContainText(first);
  await expect(names.last()).toContainText(second);

  // And it comes back: the same button reopens the bag and clears the
  // finish date. It returns to "Abierta", not "Sin abrir" — the two brews
  // above opened this bag and wrote its opening date, and reopening
  // restores the state it was actually in, not a factory default.
  await page.goto(`/bags/${bagId}`);
  await page.getByRole("button", { name: "Reabrir bolsa" }).click();
  await expect(bag.getByText("Abierta", { exact: true })).toBeVisible();
  await page.goto("/coffees");
  await expect(names.first()).toContainText(second);
});

test("brewing from a sealed bag opens it and dates it", async ({ page, testUser }) => {
  void testUser;
  const name = `Sellada ${Date.now()}`;

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  await page.getByRole("tab", { name: "Bolsas" }).click();
  const bagId = await page.locator("[data-bag-id]").first().getAttribute("data-bag-id");
  if (!bagId) throw new Error("Expected a bag panel with data-bag-id");

  const bag = page.locator(`[data-bag-id="${bagId}"]`);
  await page.goto(`/bags/${bagId}`);
  await expect(bag.getByText("Sin abrir", { exact: true })).toBeVisible();

  // You cannot take coffee out of a sealed bag. Logging a brew from one
  // used to leave it sealed, with no opening date, until somebody typed
  // one in — which is to say never.
  await page.goto(`/attempts/new?coffeeBagId=${bagId}`);
  await page.getByLabel("Molido").fill("12");
  await page.getByLabel("Segundos de molienda").fill("14.8");
  await page.getByLabel("Tiempo de extracción (ms)").fill("28000");
  await page.getByRole("button", { name: "Guardar intento" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);

  await page.goto(`/bags/${bagId}`);
  await expect(bag.getByText("Abierta", { exact: true })).toBeVisible();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await page.getByRole("button", { name: "Editar" }).first().click();
  await expect(page.locator("input#bag\\.openedAt")).toHaveValue(today);
  // The same brew is this bag's first, and that date was never written
  // either.
  await expect(page.locator("input#bag\\.firstBrewAt")).toHaveValue(today);
});
