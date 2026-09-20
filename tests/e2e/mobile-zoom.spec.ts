import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { createCoffeeBasic } from "./helpers";

// iOS Safari zooms the whole page in when a control is focused and its
// font-size is under 16px, and it never zooms back out — so one tap into a
// 14px field leaves every screen after it magnified. There is no way to
// detect that from a desktop browser, but the cause is measurable
// anywhere: this walks the form-heavy routes at phone width and fails on
// any focusable control the design left under 16px.
//
// The fix is never maximum-scale or user-scalable=no. Those do stop the
// zoom, by taking pinch-zoom away from everyone who needs it to read.
const MIN_FONT_SIZE = 16;

async function expectNothingThatZooms(page: Page, where: string) {
  const offenders = await page.evaluate(() => {
    // Types that focus without raising a keyboard or a picker, so they
    // never trigger the zoom.
    const inert = new Set([
      "hidden",
      "file",
      "checkbox",
      "radio",
      "range",
      "color",
      "submit",
      "button",
      "reset",
      "image",
    ]);
    const bad: { tag: string; type: string; name: string; fontSize: number }[] = [];
    for (const el of document.querySelectorAll("input, select, textarea")) {
      const type = (el as HTMLInputElement).type ?? "";
      if (inert.has(type)) continue;
      const rect = el.getBoundingClientRect();
      // Visually hidden (sr-only) controls aren't typed into.
      if (rect.width < 2 || rect.height < 2) continue;
      const fontSize = Number.parseFloat(getComputedStyle(el).fontSize);
      if (fontSize < 16) {
        bad.push({
          tag: el.tagName.toLowerCase(),
          type,
          name:
            el.getAttribute("name") ??
            el.getAttribute("aria-label") ??
            el.getAttribute("placeholder") ??
            el.id,
          fontSize,
        });
      }
    }
    return bad;
  });

  expect(
    offenders,
    `${where}: these controls are under ${MIN_FONT_SIZE}px, so iOS Safari will zoom the page in when they're focused`,
  ).toEqual([]);
}

test("no form control on a phone is small enough to make iOS zoom", async ({
  page,
  testUser,
}, testInfo) => {
  void testUser;
  // Above the sm breakpoint the design's 14px is correct and iOS isn't
  // involved, so there is nothing to assert.
  test.skip(
    (testInfo.project.use.viewport?.width ?? 0) >= 640,
    "the rule only applies below the sm breakpoint",
  );

  const name = `Zoom ${Date.now()}`;

  // The machine wizard's second step, which is where TagInput lives — a
  // bare input inside a bordered box rather than a field of its own, so it
  // misses the shared recipe unless someone remembers it.
  await page.goto("/settings/machines/new");
  const cont = page.getByRole("button", { name: "Continuar" });
  await expect(async () => {
    if (!(await cont.isEnabled())) await page.getByRole("button", { name: "Espresso" }).click();
    await expect(cont).toBeEnabled({ timeout: 2000 });
  }).toPass({ intervals: [500, 1000, 2000], timeout: 20000 });
  await expectNothingThatZooms(page, "/settings/machines/new paso 1");
  await cont.click();
  await expect(page.getByLabel("Espresso")).toBeVisible();
  await expectNothingThatZooms(page, "/settings/machines/new paso 2");
  await page.getByLabel("Espresso").fill("Zoom Machine");
  await page.getByLabel("Espresso").press("Enter");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/settings\/machines$/);

  await createCoffeeBasic(page, { name });
  await expect(page).toHaveURL(/\/coffees\/[0-9a-f-]+$/);
  const coffeeUrl = page.url();

  // The library's filters: a search box and three selects, all of them
  // compact enough to have been written at 14px.
  await page.goto("/coffees");
  await expect(page.getByRole("combobox", { name: "Proceso" })).toBeVisible();
  await expectNothingThatZooms(page, "/coffees");

  // The coffee wizard in completo, whose first step carries two TagInputs.
  await page.goto("/coffees/new");
  await page.getByRole("button", { name: /Completo/ }).click();
  await expect(page.getByLabel("Nombre")).toBeVisible();
  await expectNothingThatZooms(page, "/coffees/new completo");

  // A bag, opened: the densest form in the app — five date pickers, two
  // number fields and the inventory select, all of them things you tap
  // into one after another.
  await page.goto(coffeeUrl);
  await page.getByRole("tab", { name: "Bolsas" }).click();
  await page.getByRole("tabpanel").getByRole("button").first().click();
  await expect(page.getByRole("combobox", { name: "Inventario" })).toBeVisible();
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(500);
  await expectNothingThatZooms(page, "la bolsa de un café");

  for (const path of ["/settings/profile", "/settings/account", "/attempts/new"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNothingThatZooms(page, path);
  }
});
