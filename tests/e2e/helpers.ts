import type { Page } from "@playwright/test";

// The "new coffee" page is a multi-step wizard: pick Básico/Completo, then
// step through "El café" and "La bolsa". These helpers drive it the same
// way a user would, so specs don't each re-encode the step sequence.

export async function createCoffeeBasic(
  page: Page,
  { name, roaster = "E2E Roaster" }: { name: string; roaster?: string },
) {
  await page.goto("/coffees/new");
  await page.getByRole("button", { name: "Básico" }).click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Tostador").fill(roaster);
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 2/3 (bag) — nothing needed here for these tests.
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 3/3 (cover photo) — optional, skip it.
  await page.getByRole("button", { name: "Guardar café" }).click();
}

export async function createCoffeeComplete(
  page: Page,
  {
    name,
    roaster = "E2E Roaster",
    country,
    packageWeightG,
    inventoryMode,
    estimatedDoseG,
  }: {
    name: string;
    roaster?: string;
    country?: string;
    packageWeightG?: string;
    inventoryMode?: string;
    estimatedDoseG?: string;
  },
) {
  await page.goto("/coffees/new");
  await page.getByRole("button", { name: "Completo" }).click();

  // Step 1/4 (coffee): name + roaster — this is also where the
  // duplicate-coffee check runs.
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Tostador").fill(roaster);
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 2/4 (coffee): origin.
  if (country) await page.getByLabel("País").fill(country);
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 3/4 (coffee): profile — nothing needed here for these tests.
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 4/4 (coffee): altitude — nothing needed here for these tests.
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 1/3 (bag): dates — nothing needed here for these tests.
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 2/3 (bag): status + weight.
  if (packageWeightG) await page.getByLabel("Peso del paquete (g)").fill(packageWeightG);
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 3/3 (bag): inventory, dose, lot.
  if (inventoryMode) await page.getByLabel("Inventario").selectOption(inventoryMode);
  if (estimatedDoseG) await page.getByLabel("Dosis estimada (g)").fill(estimatedDoseG);
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Cover photo step — optional, skip it.
  await page.getByRole("button", { name: "Guardar café" }).click();
}
