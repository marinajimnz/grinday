import { test, expect } from "./fixtures";

test("offline page shows the saved dashboard snapshot and pending draft notice", async ({
  page,
}) => {
  // /offline works without a session (it's the no-network SW fallback), so
  // this test never needs testUser — just visit it once to be on the right
  // origin for localStorage, then reload after seeding it.
  await page.goto("/offline");

  await page.evaluate(() => {
    localStorage.setItem(
      "grinday:dashboard-snapshot",
      JSON.stringify({
        coffeeId: "test-coffee-id",
        coffeeName: "Café de prueba",
        roaster: "Tostador de prueba",
        lastAttemptNo: 4,
        lastAttemptRating: 5,
        savedAt: Date.now(),
      }),
    );
    localStorage.setItem(
      "grinday:brew-draft:test-draft-id",
      JSON.stringify({ draftId: "test-draft-id" }),
    );
  });

  await page.goto("/offline");

  await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  await expect(page.getByText("Café de prueba")).toBeVisible();
  await expect(page.getByText("Tostador de prueba")).toBeVisible();
  await expect(page.getByText("Último intento: #4 · 5/5")).toBeVisible();
  await expect(
    page.getByText("Tienes un borrador de intento guardado en este dispositivo."),
  ).toBeVisible();
});

test("offline page shows the empty state when nothing is saved locally", async ({ page }) => {
  await page.goto("/offline");

  await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  await expect(
    page.getByText("Todavía no hay nada guardado localmente para mostrar sin conexión."),
  ).toBeVisible();
});

test("account settings shows the linked email and a sign-out button", async ({
  page,
  testUser,
}) => {
  await page.goto("/settings/account");

  await expect(page.getByText(testUser.email)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();

  await expect(page.getByText("Exportar tus datos")).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar JSON" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar intentos (CSV)" })).toBeVisible();
});

test("signing out redirects to login and blocks the app again", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings/account");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "grindaily" })).toBeVisible();
  await expect(page.getByLabel("Usuario o email")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

test("a logged-out visit to any page redirects to login", async ({ page }) => {
  await page.goto("/coffees");
  await expect(page).toHaveURL(/\/login$/);
});

test("export endpoint returns the current session's data as JSON and CSV", async ({
  page,
  testUser,
}) => {
  void testUser;
  const jsonResponse = await page.request.get("/api/export?format=json");
  expect(jsonResponse.status()).toBe(200);
  expect(jsonResponse.headers()["content-type"]).toContain("application/json");
  const body = await jsonResponse.json();
  expect(body).toHaveProperty("coffees");
  expect(body).toHaveProperty("coffee_bags");
  expect(body).toHaveProperty("brew_attempts");

  const csvResponse = await page.request.get("/api/export?format=csv");
  expect(csvResponse.status()).toBe(200);
  expect(csvResponse.headers()["content-type"]).toContain("text/csv");
  expect(csvResponse.headers()["content-disposition"]).toContain("attachment");
});
