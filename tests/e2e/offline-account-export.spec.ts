import { test, expect } from "@playwright/test";

test("offline page shows the saved dashboard snapshot and pending draft notice", async ({
  page,
}) => {
  // Visit once so the app has an anonymous session and localStorage origin.
  await page.goto("/");

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

test("account settings shows the guest state with a link-account form", async ({ page }) => {
  await page.goto("/settings/account");

  await expect(page.getByText("Estás usando Coffee Journal como invitado.")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vincular cuenta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inicia sesión" })).toBeVisible();

  await expect(page.getByText("Exportar tus datos")).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar JSON" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar intentos (CSV)" })).toBeVisible();
});

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

test("export endpoint returns the current session's data as JSON and CSV", async ({ page }) => {
  // Establish the anonymous session's cookies first.
  await page.goto("/");

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
