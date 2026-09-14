import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { ensureCloneSourceFixture, CLONE_SOURCE_RECIPE, FIXTURE_EMAIL, FIXTURE_PASSWORD } from "./profileFixture";

// Same retry wrapper as testUser in fixtures.ts — logging in as a specific
// (non-throwaway) fixture account occasionally races form hydration or
// Supabase Auth under load.
async function loginAs(page: Page, user: { email: string; password: string }) {
  await expect(async () => {
    await page.goto("/login");
    await page.getByLabel("Usuario o email").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL("/", { timeout: 8000 });
  }).toPass({ intervals: [1000, 2000, 4000], timeout: 30000 });
}

test("try this recipe: clone from a public profile, save, and see the attribution badge", async ({
  page,
  testUser,
}) => {
  void testUser;
  // A handful of first-hit route compiles under next dev (profile, brew
  // live, attempt detail) on top of the usual login retry budget.
  test.setTimeout(90_000);

  const { username, coffeeName } = await ensureCloneSourceFixture();

  await page.goto(`/u/${username}`);

  await page
    .getByRole("article")
    .filter({ hasText: coffeeName })
    .getByRole("button", { name: "Probar esta receta" })
    .click();

  await expect(page).toHaveURL(/\/brew\/live\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: coffeeName })).toBeVisible();

  // The cloned recipe's numbers landed in the draft — all field cards show
  // their value at once, not just the currently-selected one. Dose is the
  // default-selected field, so its value renders twice (the big featured
  // stepper plus its own card) — `.first()` sidesteps the strict-mode
  // violation that'd otherwise cause.
  await expect(page.getByText(`${CLONE_SOURCE_RECIPE.doseG}g`).first()).toBeVisible();
  await expect(page.getByText(`${CLONE_SOURCE_RECIPE.temperatureC}°C`)).toBeVisible();
  await expect(page.getByText(`${CLONE_SOURCE_RECIPE.targetWeightG}g`)).toBeVisible();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Guardar sin cronometrar" }).click();

  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]+$/);

  const badge = page.getByRole("link", { name: `Receta de @${username}` });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute("href", `/u/${username}`);
});

test("hides the clone button on your own profile", async ({ page }) => {
  const { username, coffeeName } = await ensureCloneSourceFixture();

  await loginAs(page, { email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD });
  await page.goto(`/u/${username}`);

  await expect(
    page
      .getByRole("article")
      .filter({ hasText: coffeeName })
      .getByRole("button", { name: "Probar esta receta" }),
  ).toHaveCount(0);
});
