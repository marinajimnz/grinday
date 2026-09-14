import { test, expect } from "./fixtures";
import { ensurePublicProfileFixture } from "./profileFixture";
import { ensureFollowFixtureUsers } from "./followFixture";

// Same retry wrapper as testUser in fixtures.ts — a fresh page load
// occasionally races login-form hydration or Supabase Auth under load.
async function loginAs(
  page: import("@playwright/test").Page,
  user: { email: string; password: string },
) {
  await expect(async () => {
    await page.goto("/login");
    await page.getByLabel("Usuario o email").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL("/", { timeout: 8000 });
  }).toPass({ intervals: [1000, 2000, 4000], timeout: 30000 });
}

test("shows the admin role and saves a new display name", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings/profile");

  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  await expect(page.getByText("Admin")).toBeVisible();

  await page.getByLabel("Nombre").fill("Marina");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Nombre")).toHaveValue("Marina");
});

test("rejects an empty display name", async ({ page, testUser }) => {
  void testUser;
  await page.goto("/settings/profile");

  await page.getByLabel("Nombre").fill("   ");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Escribe un nombre")).toBeVisible();
});

test("shows another user's public profile, read-only", async ({ page, testUser }) => {
  void testUser;
  const { username, coffeeName } = await ensurePublicProfileFixture();

  await page.goto(`/u/${username}`);

  await expect(page.getByText(`@${username}`)).toBeVisible();
  // The coffee's name legitimately appears twice (its own card, and again
  // in the recent-attempts row for the seeded attempt) — scope to the card.
  await expect(page.getByRole("article").getByText(coffeeName)).toBeVisible();

  // No owner-only actions leak into a stranger's view of this profile.
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archivar" })).toHaveCount(0);
});

test("following updates both sides' lists, unfollowing reverses it", async ({ browser }) => {
  // Two logins plus several first-hit route compilations under next dev —
  // comfortably over the default 30s budget.
  test.setTimeout(90_000);
  const { a, b } = await ensureFollowFixtureUsers();

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await loginAs(pageA, a);

  // A visits B's profile and follows. The button flips label optimistically
  // on click, before the server mutation actually lands — wait for it to
  // re-enable (isPending clears) so the insert has really committed before
  // checking it from elsewhere.
  await pageA.goto(`/u/${b.username}`);
  await pageA.getByRole("button", { name: "Seguir" }).click();
  await expect(pageA.getByRole("button", { name: "Siguiendo" })).toBeEnabled();

  // A's "Siguiendo" list includes B. Usernames are prefixes of each other
  // by fixture design ("perfil-publico-e2e" / "-b"), so match exactly.
  await pageA.goto(`/u/${a.username}/siguiendo`);
  await expect(pageA.getByText(`@${b.username}`, { exact: true })).toBeVisible();

  // B's "Seguidores" list includes A.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await loginAs(pageB, b);
  await pageB.goto(`/u/${b.username}/seguidores`);
  await expect(pageB.getByText(`@${a.username}`, { exact: true })).toBeVisible();

  // A unfollows B — disappears from both lists.
  await pageA.goto(`/u/${b.username}`);
  await pageA.getByRole("button", { name: "Siguiendo" }).click();
  await expect(pageA.getByRole("button", { name: "Seguir" })).toBeEnabled();

  await pageA.goto(`/u/${a.username}/siguiendo`);
  await expect(pageA.getByText(`@${b.username}`, { exact: true })).toHaveCount(0);

  await pageB.goto(`/u/${b.username}/seguidores`);
  await expect(pageB.getByText(`@${a.username}`, { exact: true })).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});

test("404s for a username that doesn't exist", async ({ page, testUser }) => {
  void testUser;
  // Next dev doesn't surface notFound() as an HTTP 404 on the navigation
  // response the way a production build does — assert on the rendered
  // not-found UI instead, which is what actually matters here.
  await page.goto("/u/this-username-does-not-exist-e2e");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
});
