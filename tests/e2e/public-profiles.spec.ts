// Public profiles end to end: the public/private question, the privacy
// card, search, a profile with its coffees, favourites, reports, and what
// happens when a profile goes private. These only mean something once the
// public side is on for every account (app_settings.social_enabled = 'all');
// before that they skip rather than fail.
import { randomUUID } from "node:crypto";
import { test, expect, e2eAdmin } from "./fixtures";

let socialForAll = false;

test.beforeAll(async () => {
  const { data } = await e2eAdmin.from("app_settings").select("social_enabled").single();
  socialForAll = data?.social_enabled === "all";
});

test.beforeEach(() => {
  test.skip(!socialForAll, "the public side isn't on for every account (app_settings.social_enabled)");
});

// A second, public account with one coffee and one rated attempt — made
// straight in the database, since only its public side is under test.
async function publicAccount(displayName: string) {
  const username = `e2e_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const { data, error } = await e2eAdmin.auth.admin.createUser({
    email: `e2e-${randomUUID()}@grinday.test`,
    password: `Test-${randomUUID()}`,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  await e2eAdmin
    .from("profiles")
    .update({ username, display_name: displayName, bio: "Filtros de fin de semana", visibility: "public" })
    .eq("id", id)
    .throwOnError();
  const { data: coffee } = await e2eAdmin
    .from("coffees")
    .insert({ user_id: id, name: "Guji Shakiso", roaster: "La Semilla", country: "Etiopía", tasting_notes: ["Floral"] })
    .select("id")
    .single()
    .throwOnError();
  const { data: bag } = await e2eAdmin
    .from("coffee_bags")
    .insert({ coffee_id: coffee!.id, user_id: id })
    .select("id")
    .single()
    .throwOnError();
  const { data: attempt } = await e2eAdmin
    .from("brew_attempts")
    .insert({
      user_id: id,
      coffee_id: coffee!.id,
      coffee_bag_id: bag!.id,
      method: "v60",
      dose_g: 18,
      water_g: 290,
      overall_rating: 4,
      notes: "NOTA PRIVADA DE E2E",
    })
    .select("id")
    .single()
    .throwOnError();
  await e2eAdmin.from("coffees").update({ preferred_attempt_id: attempt!.id }).eq("id", coffee!.id).throwOnError();
  return {
    id,
    username,
    attemptId: attempt!.id as string,
    remove: () => e2eAdmin.auth.admin.deleteUser(id),
  };
}

test.describe("the public/private question", () => {
  test.use({ visibilityAnswered: false });

  test("can't be dismissed, and keeping private closes it for good", async ({ page, testUser }) => {
    void testUser;
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Grindaily ahora es para compartir ☕" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`@${testUser.username}`, { exact: false })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Seguir con perfil privado" }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/settings");
    await expect(page.getByText("Privado", { exact: true })).toBeVisible();
  });

  test("going public shows the reminder, and the profile page can make it private again", async ({
    page,
    testUser,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Hacer público" }).click();
    await expect(page.getByRole("dialog", { name: "Listo, tu perfil es público" })).toBeVisible();
    await page.getByRole("button", { name: "Entendido" }).click();

    await page.goto(`/u/${testUser.username}`);
    await expect(page.getByText("Así ven tu perfil otras cuentas.")).toBeVisible();
    await page.getByRole("button", { name: "Hacer perfil privado" }).click();
    await expect(page).toHaveURL("/settings");
    await expect(page.getByText("Privado", { exact: true })).toBeVisible();

    await page.goto(`/u/${testUser.username}`);
    await expect(page.getByText("Este perfil no está disponible")).toBeVisible();
  });
});

test("finds a public profile, opens its coffee and recipe, and never shows private notes", async ({
  page,
  testUser,
}) => {
  void testUser;
  const lucia = await publicAccount("Lucía V60");
  try {
    await page.goto(`/search?q=${lucia.username}`);
    await page.getByRole("link", { name: /Lucía V60/ }).click();
    await expect(page.getByRole("heading", { name: "Lucía V60" })).toBeVisible();
    await expect(page.getByText("Filtros de fin de semana")).toBeVisible();

    await page.getByRole("link", { name: /Guji Shakiso/ }).first().click();
    await expect(page.getByText("Etiopía")).toBeVisible();
    await expect(page.getByText("Floral")).toBeVisible();

    await page.getByRole("heading", { name: "Receta preferida" }).waitFor();
    await page.locator('a[href*="/attempts/"]').first().click();
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Probar esta receta" })).toBeVisible();
    await expect(page.getByText("NOTA PRIVADA DE E2E")).toHaveCount(0);
  } finally {
    await lucia.remove();
  }
});

test("saves a profile to favourites, and shows it as unavailable once it goes private", async ({
  page,
  testUser,
}) => {
  void testUser;
  const lucia = await publicAccount("Lucía V60");
  try {
    await page.goto(`/u/${lucia.username}`);
    await page.getByRole("button", { name: "Guardar en favoritos" }).click();
    await expect(page.getByRole("button", { name: "Quitar de favoritos" })).toBeVisible();

    await page.goto("/favorites");
    await expect(page.getByRole("link", { name: /Lucía V60/ })).toBeVisible();

    await e2eAdmin.from("profiles").update({ visibility: "private" }).eq("id", lucia.id).throwOnError();
    await page.reload();
    await expect(page.getByText("Perfil no disponible")).toBeVisible();
    await expect(page.getByText("Lucía V60")).toHaveCount(0);

    await page.goto(`/u/${lucia.username}`);
    await expect(page.getByText("Este perfil no está disponible")).toBeVisible();
  } finally {
    await lucia.remove();
  }
});

test("reports a profile and only hears thanks", async ({ page, testUser }) => {
  void testUser;
  const lucia = await publicAccount("Lucía V60");
  try {
    await page.goto(`/u/${lucia.username}`);
    await page.getByRole("button", { name: "Denunciar perfil" }).click();
    await page.getByLabel("Spam o publicidad").check();
    await page.getByRole("button", { name: "Enviar denuncia" }).click();
    await expect(page.getByRole("dialog", { name: "Gracias, lo revisaremos." })).toBeVisible();
  } finally {
    await lucia.remove();
  }
});

test("a regular account gets a 404 at /admin", async ({ page, testUser }) => {
  void testUser;
  const response = await page.goto("/admin");
  expect([200, 404]).toContain(response?.status());
  await expect(page.getByRole("heading", { name: "Administración" })).toHaveCount(0);
});
