import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

// The point of the whole change: one coffee, two recipes worth keeping. Under
// the old model marking the second one silently unmarked the first, so this
// test is the one that would have been impossible to write.
test("keeps several favourite recipes for the same coffee and lists them", async ({
  page,
  testUser,
}) => {
  void testUser;
  const name = `Favourite Coffee ${Date.now()}`;

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  const coffeeUrl = page.url();

  async function logAttempt(grind: string) {
    await page.goto(coffeeUrl);
    await page.getByRole("link", { name: "Registrar manual" }).click();
    await expect(page).toHaveURL(/\/attempts\/new/);
    await expect(page.getByLabel("Molido")).toBeVisible();
    await page.getByLabel("Molido").fill(grind);
    await page.getByLabel("Dosificación").selectOption("auto");
    await page.getByLabel("Tamaño").selectOption("double");
    await page.getByLabel("Modo de shot").selectOption("double");
    await page.getByRole("button", { name: "Guardar intento" }).click();
    await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
    await page.getByRole("button", { name: "Marcar como favorita" }).click();
    await expect(page.getByRole("button", { name: "Quitar de favoritas" })).toBeVisible();
  }

  await logAttempt("12");
  await logAttempt("18");

  // Both still starred — the second star did not take the first one down.
  await page.goto(coffeeUrl);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByLabel("Favorita")).toHaveCount(2);

  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "Recetas favoritas" })).toBeVisible();
  await expect(page.getByText("2 recetas")).toBeVisible();
  // One heading for the coffee, both of its recipes beneath it.
  await expect(page.getByRole("heading", { name })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Ver intento #1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver intento #2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preparar receta" })).toHaveCount(2);

  // Unstarring takes one off the list and leaves the other.
  await page.getByRole("link", { name: "Ver intento #1" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Quitar de favoritas" }).click();
  await expect(page.getByRole("button", { name: "Marcar como favorita" })).toBeVisible();

  await page.goto("/recipes");
  await expect(page.getByText("1 receta", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver intento #2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver intento #1" })).toHaveCount(0);
});

test("reaches the favourites from Home and from the coffee library", async ({ page, testUser }) => {
  void testUser;
  const name = `Linked Coffee ${Date.now()}`;

  await createCoffeeBasic(page, { name });
  const coffeeUrl = page.url();

  await page.getByRole("link", { name: "Registrar manual" }).click();
  await expect(page.getByLabel("Molido")).toBeVisible();
  await page.getByLabel("Molido").fill("14");
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Tamaño").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");
  await page.getByRole("button", { name: "Guardar intento" }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Marcar como favorita" }).click();
  await expect(page.getByRole("button", { name: "Quitar de favoritas" })).toBeVisible();

  // With exactly one favourite, and that one already on the card, the link
  // would only lead back to what is on screen — so it stays hidden.
  await page.goto("/");
  await expect(page.getByText("Receta favorita")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver todas las recetas" })).toHaveCount(0);

  // The library's own way in doesn't depend on any of that.
  await page.goto("/coffees");
  await page.getByRole("link", { name: "Recetas favoritas" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByRole("heading", { name: "Recetas favoritas" })).toBeVisible();

  // A second favourite on the same coffee. The card can only show one of
  // them, so now the link has something to lead to.
  await page.goto(coffeeUrl);
  await page.getByRole("link", { name: "Registrar manual" }).click();
  await expect(page.getByLabel("Molido")).toBeVisible();
  await page.getByLabel("Molido").fill("20");
  await page.getByLabel("Dosificación").selectOption("auto");
  await page.getByLabel("Tamaño").selectOption("double");
  await page.getByLabel("Modo de shot").selectOption("double");
  await page.getByRole("button", { name: "Guardar intento" }).click();
  await page.getByRole("button", { name: "Marcar como favorita" }).click();
  await expect(page.getByRole("button", { name: "Quitar de favoritas" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Ver todas las recetas" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByText("2 recetas")).toBeVisible();
});
