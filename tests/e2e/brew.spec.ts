import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";
import es from "../../src/lib/i18n/dictionaries/es";

// Drives two wizards (equipment, then coffee) before the six brew steps
// themselves — more than the default 30s budget once any of the hydration
// retries below actually fire.
test.setTimeout(90_000);

// A brand-new account owns no equipment, and /brew/new only offers the
// methods that have a machine saved — so the espresso machine has to exist
// before the flow is reachable at all.
async function addEspressoMachine(page: import("@playwright/test").Page) {
  await page.goto("/settings/machines/new");

  // Same pre-hydration race as the coffee wizard's mode picker (see the note
  // on selectWizardMode in helpers.ts): this toggle is the first click after
  // a fresh navigation, so it can land before React is listening and leave
  // "Continuar" disabled with nothing selected. Re-clicking only when the
  // selection didn't take keeps the retry from toggling it back off.
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
}


test("guided brew: recipe, timer, photo step, and result", async ({ page, testUser }) => {
  void testUser;
  const name = `Brew Coffee ${Date.now()}`;

  await addEspressoMachine(page);

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);

  // A second coffee, finished: nothing left to brew from it. It rides
  // along on this test's equipment setup rather than paying for its own.
  const spent = `Terminado ${Date.now()}`;
  await createCoffeeBasic(page, { name: spent });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  await page.getByRole("tab", { name: "Bolsas" }).click();
  await page.locator("button[data-bag-id]").first().click();
  await page.getByRole("button", { name: "Marcar como terminada" }).click();
  await expect(page.getByText("Terminada", { exact: true })).toBeVisible();

  // Step 1/6 — method.
  await page.goto("/brew/new");
  await expect(page.getByText("Paso 1 de 6")).toBeVisible();
  await page.getByRole("button", { name: "Espresso" }).click();

  // Step 2/6 — coffee. Picking one starts the draft and moves to /brew/live.
  await expect(page.getByText("Paso 2 de 6")).toBeVisible();
  // The picker offers coffees you can actually brew. It used to fall back
  // to "whatever bag exists", so a coffee down to finished bags appeared
  // here pointing at an empty one.
  await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(spent) })).toHaveCount(0);
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

  // One cup or two: espresso's own question, pre-selected at one the way
  // every other card on this step arrives pre-filled. Picking two must not
  // move the dose, the beverage weight or the ratio — it records what the
  // shot was for, and a double is a different basket, not a doubled single.
  await expect(page.getByRole("button", { name: "Una taza" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Dos tazas" }).click();
  await expect(page.getByRole("button", { name: "Dos tazas" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /^Café/ })).toContainText("21g");
  await expect(page.getByRole("button", { name: /^Peso de bebida/ })).toContainText("42g");
  await expect(page.getByText("1:2", { exact: true })).toBeVisible();

  // Pressurized or not: optional, so a first brew proposes neither — a
  // guess would put a wrong fact on the attempt.
  await expect(page.getByRole("button", { name: es.enums.basketType.pressurized, exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: es.enums.basketType.non_pressurized, exact: true }).click();
  await expect(
    page.getByRole("button", { name: es.enums.basketType.non_pressurized, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 4/6 — timer.
  await expect(page.getByText("Paso 4 de 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cronómetro" })).toBeVisible();
  // "Continuar sin cronometrar" is the way out for a brew you never timed,
  // so it's on screen right up until the shot starts.
  await expect(page.getByRole("button", { name: "Continuar sin cronometrar" })).toBeVisible();

  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("En marcha")).toBeVisible();

  // Once it's running that same button would end the brew with no reading,
  // from a full-width target directly under "Parar" — it has to be gone.
  await expect(page.getByRole("button", { name: "Continuar sin cronometrar" })).toHaveCount(0);

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
  const extractionCard = page.getByRole("button", { name: /^Extracción/ });
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

  // The recipe this brew was actually pulled with — 21 g in, 42 g out — has
  // to be the thing the page opens on. It used to show the manual form's
  // columns instead, which a guided brew never writes, so the page you came
  // to for the recipe had everything except the recipe.
  await expect(page.getByText("1:2", { exact: true })).toBeVisible();
  await expect(page.getByText("21 g")).toBeVisible();
  await expect(page.getByText("42 g")).toBeVisible();
  // And the cup count came with it, so the journal can tell a 42 g double
  // apart from a 42 g single later on. It rides the method line as a badge
  // now — the digit and the cup — rather than spelling "Dos tazas" out in
  // the grid below.
  const methodLine = page.getByText("Espresso", { exact: true }).locator("xpath=..");
  await expect(methodLine.getByText("2", { exact: true })).toBeVisible();
  await expect(methodLine.getByText(es.brew.cupCount)).toBeAttached();
  // The basket is part of the recipe too.
  await expect(page.getByText(es.brew.basketType, { exact: true })).toBeVisible();
  await expect(page.getByText(es.enums.basketType.non_pressurized, { exact: true })).toBeVisible();

  // The dashboard summarises the same brew the same way in both of its
  // cards: cups, dose against ratio, and the clock. These are the numbers
  // that say what a preparation was, so they have to survive the trip from
  // the guided flow to the two places you read it back.
  const attemptUrl = page.url();
  await page.goto("/");
  // Both cards, so each value appears exactly twice. The cups group is
  // checked through its screen-reader label, since a bare "2" on a
  // dashboard could be almost anything.
  await expect(page.getByText("21 g", { exact: true })).toHaveCount(2);
  await expect(page.getByText("1:2", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Tazas", { exact: true })).toHaveCount(2);
  // And the row still opens the attempt it summarises.
  await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toHaveAttribute(
    "href",
    /\/attempts\/[0-9a-f-]+$/,
  );
  await page.goto(attemptUrl);

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
  await expect(
    page.getByRole("button", { name: es.enums.basketType.non_pressurized, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("seeds a new brew from the preferred recipe, not merely the newest attempt", async ({
  page,
  testUser,
}) => {
  void testUser;
  const name = `Preferred Coffee ${Date.now()}`;

  await addEspressoMachine(page);
  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  const coffeeUrl = page.url();

  // Two espresso attempts, #1 starred. #2 is the newest, so anything seeding
  // from "most recent for this (coffee, method)" lands on the wrong one.
  async function logAttempt(grind: string) {
    await page.goto(coffeeUrl);
    await page.getByRole("link", { name: "Registrar manual" }).click();
    await expect(page).toHaveURL(/\/attempts\/new/);
    await page.getByLabel("Molido").fill(grind);
    await page.getByLabel("Dosificación").selectOption("auto");
    await page.getByLabel("Tamaño").selectOption("double");
    await page.getByLabel("Modo de shot").selectOption("double");
    await page.getByRole("button", { name: "Guardar intento" }).click();
    await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  }

  await logAttempt("12");
  await expect(page.getByRole("heading", { name: "Intento #1" })).toBeVisible();
  await page.getByRole("button", { name: "Marcar como preferido" }).click();
  await expect(page.getByRole("button", { name: "Quitar de preferido" })).toBeVisible();

  await logAttempt("18");
  await expect(page.getByRole("heading", { name: "Intento #2" })).toBeVisible();

  await page.goto("/brew/new");
  await expect(page.getByText("Paso 1 de 6")).toBeVisible();
  await page.getByRole("button", { name: "Espresso" }).click();

  // The badge only claims a preferred recipe when it was brewed with the
  // method just chosen — here it was, so it has to name #1.
  await expect(page.getByText("Receta preferida · intento #1")).toBeVisible();

  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/brew\/live\/[0-9a-f-]+$/);
  await expect(page.getByText("Basado en intento #1")).toBeVisible();
  await expect(page.getByText("Basado en intento #2")).toHaveCount(0);
});
