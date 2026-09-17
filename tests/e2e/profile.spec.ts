import { test, expect } from "./fixtures";

test("shows the coffee lover role and saves a new display name", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings/profile");

  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  // Accounts created via admin.auth.admin.createUser (like this test fixture)
  // default to 'coffee_lover' since supabase/migrations/0018_profile_role_coffee_lover.sql —
  // only the original seeded accounts are 'admin'.
  await expect(page.getByText("Coffee lover")).toBeVisible();

  // Same under-load retry as the "rejects an empty display name" test below:
  // this round trip also hits Supabase (a real profile update), so it's more
  // exposed to the same class of flakiness than the pure-validation path.
  await expect(async () => {
    await page.getByLabel("Nombre").fill("Marina");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Guardado.")).toBeVisible({ timeout: 5000 });
  }).toPass({ intervals: [1000, 2000, 4000], timeout: 30000 });

  await page.reload();
  await expect(page.getByLabel("Nombre")).toHaveValue("Marina");
});

test("rejects an empty display name", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings/profile");

  // The validation itself is synchronous and needs no Supabase round trip,
  // but the Server Action still has to go through `next dev`, which can
  // occasionally take longer than the global expect timeout when several
  // e2e sessions run in parallel against the same dev server — the same
  // class of under-load flakiness fixtures.ts already retries for login.
  await expect(async () => {
    await page.getByLabel("Nombre").fill("   ");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Escribe un nombre")).toBeVisible({ timeout: 5000 });
  }).toPass({ intervals: [1000, 2000, 4000], timeout: 30000 });
});
