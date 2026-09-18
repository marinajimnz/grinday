import { describe, expect, it } from "vitest";
import { WIZARD_STEP_COUNT, wizardSteps } from "@/components/coffee/wizard/steps";
import es from "@/lib/i18n/dictionaries/es";
import en from "@/lib/i18n/dictionaries/en";

describe("coffee wizard steps", () => {
  it("walks the coffee, then the bag, then the photo", () => {
    expect(wizardSteps("basic", false).map((s) => s.key)).toEqual([
      "basic-coffee",
      "basic-bag",
      "cover-photo",
    ]);
    expect(wizardSteps("complete", false)).toHaveLength(8);
  });

  it("skips everything about the coffee when the coffee already exists", () => {
    // Adding a second bag to a coffee that's already in the library — the
    // name, the roaster and the origin are already known.
    expect(wizardSteps("basic", true).map((s) => s.key)).toEqual(["basic-bag", "cover-photo"]);
    expect(wizardSteps("complete", true).every((s) => s.section === "bag")).toBe(true);
  });

  it("promises the number of steps it actually walks, in every language", () => {
    // The basic card used to say "in 2 steps" while the bar counted three:
    // the cover photo was added after the sentence was written. The count
    // is interpolated now, so the only way to break this again is to write
    // a number back into the copy — which is what this asserts against.
    for (const [locale, dict] of Object.entries({ es, en })) {
      for (const key of ["modeBasicDescription", "modeCompleteDescription"] as const) {
        expect(dict.coffees[key], `${locale}.${key}`).toContain("{count}");
        expect(dict.coffees[key], `${locale}.${key}`).not.toMatch(/\b\d+\b/);
      }
    }
    expect(WIZARD_STEP_COUNT).toEqual({ basic: 3, complete: 8 });
  });
});
