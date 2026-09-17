import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

// Drives two wizards (equipment, then coffee) before the six brew steps
// themselves — more than the default 30s budget once any of the hydration
// retries below actually fire.
test.setTimeout(90_000);

test("guided brew: recipe, timer, photo step, and result", async ({ page, testUser }) => {
  void testUser;
  const name = `Brew Coffee ${Date.now()}`;

  // A brand-new account owns no equipment, and /brew/new only offers the
  // methods that have a machine saved — so the espresso machine has to
  // exist before the flow is reachable at all.
  await page.goto("/settings/machines/new");

  // Same pre-hydration race as the coffee wizard's mode picker (see the
  // note on selectWizardMode in helpers.ts): this toggle is the first click
  // after a fresh navigation, so it can land before React is listening and
  // leave "Continuar" disabled with nothing selected. Re-clicking only when
  // the selection didn't take keeps the retry from toggling it back off.
  const continueButton = page.getByRole("button", { name: "Continuar" });
  await expect(async () => {
    if (!(await continueButton.isEnabled())) {
      await page.getByRole("button", { name: "Espresso" }).click();
    }
    await expect(continueButton).toBeEnabled({ timeout: 2000 });
  }).toPass({ intervals: [500, 1000, 2000], timeout: 20000 });

  await continueButton.click();
  await page.getByLabel("Espresso").fill("E2E Espresso Machine");
  await page.getByLabel("Espresso").press("Enter");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/settings\/machines$/);

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  // Step 1/6 — method.
  await page.goto("/brew/new");
  await expect(page.getByText("Paso 1 de 6")).toBeVisible();
  await page.getByRole("button", { name: "Espresso" }).click();

  // Step 2/6 — coffee. Picking one starts the draft and moves to /brew/live.
  await expect(page.getByText("Paso 2 de 6")).toBeVisible();
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/brew\/live\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Step 3/6 — recipe. A first-ever espresso seeds 20 g in / 40 g out, so
  // the auto ratio starts at 1:2.
  await expect(page.getByText("Paso 3 de 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Configura tu receta" })).toBeVisible();
  await expect(page.getByText("1:2", { exact: true })).toBeVisible();

  // The +/- control is shared: it acts on whichever field card is selected,
  // which is the dose ("Café") to begin with. Two taps of +0.5 g -> 21 g,
  // and the ratio recomputes against the unchanged 40 g out.
  await page.getByRole("button", { name: "Aumentar Café" }).click({ clickCount: 2 });
  await expect(page.getByRole("button", { name: /^Café/ })).toContainText("21g");
  await expect(page.getByText("1:1.9", { exact: true })).toBeVisible();

  // Selecting another card re-points that same control at it — bring the
  // beverage weight to 42 g and the ratio lands back on 1:2.
  await page.getByRole("button", { name: /^Peso de bebida/ }).click();
  await page.getByRole("button", { name: "Aumentar Peso de bebida" }).click({ clickCount: 2 });
  await expect(page.getByRole("button", { name: /^Peso de bebida/ })).toContainText("42g");
  await expect(page.getByText("1:2", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 4/6 — timer.
  await expect(page.getByText("Paso 4 de 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cronómetro" })).toBeVisible();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByText("En marcha")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Parar" }).click();

  // Step 5/6 — photo. It sits between the timer and the rating because this
  // is the only moment the coffee still looks the way it came out; skipping
  // it is a first-class path, so that's the one under test here.
  await expect(page.getByText("Paso 5 de 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Foto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Añadir foto" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar sin foto" }).click();

  // Step 6/6 — result.
  await expect(page.getByText("Paso 6 de 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resultado" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a la foto" })).toBeVisible();

  // The recipe edits survived the timer and photo steps.
  await expect(page.getByRole("button", { name: /^Café/ })).toContainText("21g");

  // The stopped timer pre-filled the extraction time.
  const extractionCard = page.getByRole("button", { name: /^Tiempo de extracción/ });
  const extractionSeconds = Number((await extractionCard.textContent())?.match(/([\d.]+)s/)?.[1]);
  expect(extractionSeconds).toBeGreaterThan(0.5);

  await page
    .getByRole("radiogroup", { name: "Puntuación general" })
    .getByRole("radio", { name: "4" })
    .click();
  await page.getByLabel("Notas").fill("Dulce, buen crema.");

  await page.getByRole("button", { name: "Guardar receta" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Intento #1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fotos del espresso" })).toBeVisible();

  // "Duplicar y ajustar" is a preparation like any other, so it has to land
  // on the same live brew flow — step 3/6, recipe card grid — seeded from
  // this attempt, not on the plain manual form at /attempts/new.
  await page.getByRole("button", { name: "Duplicar y ajustar" }).click();
  await expect(page).toHaveURL(/\/brew\/live\/[0-9a-f-]+$/);
  await expect(page.getByText("Paso 3 de 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Configura tu receta" })).toBeVisible();
  await expect(page.getByText("Basado en intento #1")).toBeVisible();
  // Seeded from intento #1, not from the first-time defaults (20 g / 40 g).
  await expect(page.getByRole("button", { name: /^Café/ })).toContainText("21g");
  await expect(page.getByRole("button", { name: /^Peso de bebida/ })).toContainText("42g");
});
