import { test, expect } from "@playwright/test";

test("loads the dashboard and shows main navigation without horizontal scroll", async ({
  page,
}) => {
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

test("navigates to settings and machines", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("link", { name: "Máquinas" }).click();
  await expect(page).toHaveURL(/\/settings\/machines/);
  await expect(
    page.getByText("Barista Express Impress"),
  ).toBeVisible();
});
