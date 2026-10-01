import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

test("logs an attempt manually, marks it preferred, duplicates it, and compares both", async ({
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

  // "Muela" belongs to the guided flow's grinder card and nowhere else.
  // This form used to carry a second field of the same name writing a
  // different column (upper_burr_setting, dropped in 0035), so the word
  // meant one thing here and another over there.
  //
  // The visible-field wait is what makes the count mean anything: this
  // page renders its form after the bag loads, and "no muela field" is
  // true of every empty page in the world.
  await expect(page.getByLabel("Molido")).toBeVisible();
  await expect(page.getByLabel(/muela/i)).toHaveCount(0);

  await page.getByLabel("Molido").fill("12");
  await page.getByLabel("Segundos de molienda").fill("14.8");
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Tamaño").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");
  await page.getByRole("button", { name: "Guardar intento" }).click();

  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Intento #1" })).toBeVisible();

  await page.getByRole("button", { name: "Marcar como favorita" }).click();
  await expect(page.getByRole("button", { name: "Quitar de favoritas" })).toBeVisible();

  // Duplicating is a preparation, not a second manual log: it opens the same
  // live brew flow as "Preparar", already seeded from this attempt.
  await page.getByRole("button", { name: "Duplicar y ajustar" }).click();
  await expect(page).toHaveURL(/\/brew\/live\/[0-9a-f-]+$/);
  await expect(page.getByText("Paso 3 de 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Configura tu receta" })).toBeVisible();
  await expect(page.getByText("Basado en intento #1")).toBeVisible();

  // brew.spec.ts drives the six steps in full; here it only has to reach a
  // second saved attempt, so the shot goes in without timing it. Skipping
  // the clock skips the clock and nothing else: the photo and rating steps
  // still follow, and the attempt is saved from the last of them.
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("Paso 4 de 6")).toBeVisible();
  await page.getByRole("button", { name: "Continuar sin cronometrar" }).click();
  await expect(page.getByText("Paso 5 de 6")).toBeVisible();
  await page.getByRole("button", { name: "Continuar sin foto" }).click();
  await expect(page.getByText("Paso 6 de 6")).toBeVisible();
  await page.getByRole("button", { name: "Guardar receta" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Intento #2" })).toBeVisible();

  // The dashboard's recipe card prefers the coffee's pinned recipe over the
  // most recent attempt, so with #1 preferred and #2 the newest it has to
  // show #1 — that's the branch that costs a second query, and the only one
  // where the card labels itself "Receta favorita" instead of "Último
  // intento". The coffee's own URL is taken from this page first: the
  // dashboard reaches its coffee through the recipe card, not through a
  // roaster link, so the click below has nothing to find once we leave.
  const coffeeHref = await page
    .getByRole("link", { name: /E2E Roaster/ })
    .first()
    .getAttribute("href");
  if (!coffeeHref) throw new Error("Expected the attempt page to link to its coffee");

  await page.goto("/");
  await expect(page.getByText("Receta favorita")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver intento #1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preparar receta" })).toBeVisible();

  // Preparar / quitar del inicio / eliminar used to need a held finger and
  // carried no mark saying so, which left them unreachable from a keyboard
  // and undiscoverable by eye. The row now carries the control.
  await page.getByRole("button", { name: "Acciones del intento" }).first().click();
  const menu = page.getByRole("menu", { name: "Acciones del intento" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Preparar" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Quitar del inicio" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);

  await page.goto(coffeeHref);
  await expect(page.getByText("Receta favorita")).toBeVisible();

  const checkboxes = page.locator('input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await page.getByRole("button", { name: /Comparar/ }).click();

  await expect(page).toHaveURL(/\/compare\?ids=/);
  await expect(page.getByText("#1")).toBeVisible();
  await expect(page.getByText("#2")).toBeVisible();

  // "Usar como base" is the same duplicate action as on the attempt page, so
  // it lands on the live brew flow too — one column per attempt.
  await page.getByRole("button", { name: "Usar como base" }).first().click();
  await expect(page).toHaveURL(/\/brew\/live\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Configura tu receta" })).toBeVisible();
});
