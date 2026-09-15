import { test, expect } from "./fixtures";

test("loads the dashboard and shows main navigation without horizontal scroll", async ({
  page,
  testUser,
}) => {
  void testUser;
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cafés" }).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Preparar" }).first(),
  ).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});

test("navigates to settings and machines", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings");
  await page.getByRole("link", { name: "Máquinas" }).click();
  await expect(page).toHaveURL(/\/settings\/machines/);

  // A brand-new account owns no equipment, so what proves the page rendered
  // is its empty state, not a model name. It used to assert "Barista Express
  // Impress" — a row from the machine catalogue that page listed before the
  // 0020 equipment rework replaced it with the grinder and method cards.
  await expect(page.getByText("Molinillo", { exact: true })).toBeVisible();
  await expect(page.getByText("Aún no has añadido ninguna máquina")).toBeVisible();
});
