import type { ComponentType } from "react";
import {
  CoffeeAltitudeFields,
  CoffeeBasicModeFields,
  CoffeeBasicsFields,
  CoffeeOriginFields,
  CoffeeProfileFields,
} from "./CoffeeStepFields";
import {
  BagBasicModeFields,
  BagConditionFields,
  BagDatesFields,
  BagInventoryFields,
} from "./BagStepFields";
import { CoverPhotoPicker } from "./CoverPhotoPicker";
import type { CoffeeWizardMode } from "./types";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export type WizardStep = {
  key: string;
  section: "coffee" | "bag";
  title: (dict: Dictionary) => string;
  // Step components come from two families with different prop shapes
  // (coffee steps take `control`, bag steps don't); see CoffeeStepFields /
  // BagStepFields for why those are loosely typed too.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Fields: ComponentType<any>;
};

const BASIC_COFFEE_STEPS: WizardStep[] = [
  { key: "basic-coffee", section: "coffee", title: (d) => d.coffees.theCoffee, Fields: CoffeeBasicModeFields },
];
const BASIC_BAG_STEPS: WizardStep[] = [
  { key: "basic-bag", section: "bag", title: (d) => d.coffees.theBag, Fields: BagBasicModeFields },
];
const COMPLETE_COFFEE_STEPS: WizardStep[] = [
  { key: "coffee-basics", section: "coffee", title: (d) => d.coffees.stepCoffeeBasics, Fields: CoffeeBasicsFields },
  { key: "coffee-origin", section: "coffee", title: (d) => d.coffees.stepCoffeeOrigin, Fields: CoffeeOriginFields },
  { key: "coffee-profile", section: "coffee", title: (d) => d.coffees.stepCoffeeProfile, Fields: CoffeeProfileFields },
  { key: "coffee-altitude", section: "coffee", title: (d) => d.coffees.stepCoffeeAltitude, Fields: CoffeeAltitudeFields },
];
const COMPLETE_BAG_STEPS: WizardStep[] = [
  { key: "bag-dates", section: "bag", title: (d) => d.coffees.stepBagDates, Fields: BagDatesFields },
  { key: "bag-condition", section: "bag", title: (d) => d.coffees.stepBagCondition, Fields: BagConditionFields },
  { key: "bag-inventory", section: "bag", title: (d) => d.coffees.stepBagInventory, Fields: BagInventoryFields },
];

// Last step in every mode, handled outside the register()-driven fields
// system in NewCoffeeForm (see the "cover-photo" special case in its
// render) since it holds a plain File, not a form field.
const COVER_PHOTO_STEP: WizardStep = {
  key: "cover-photo",
  section: "bag",
  title: (d) => d.coffees.stepCoverPhoto,
  Fields: CoverPhotoPicker,
};

// Adding a bag to a coffee that already exists skips everything about the
// coffee itself — so the same mode is a shorter walk, and the step count
// the mode cards promise is the long one, which is all they can know.
export function wizardSteps(mode: CoffeeWizardMode, existingCoffee: boolean): WizardStep[] {
  const coffeeSteps = mode === "basic" ? BASIC_COFFEE_STEPS : COMPLETE_COFFEE_STEPS;
  const bagSteps = mode === "basic" ? BASIC_BAG_STEPS : COMPLETE_BAG_STEPS;
  const tail = [...bagSteps, COVER_PHOTO_STEP];
  return existingCoffee ? tail : [...coffeeSteps, ...tail];
}

// What the mode cards promise, counted from the list above rather than
// written into the copy. The card used to say "in 2 steps" because that was
// true when it was written: the cover photo was added afterwards and the
// sentence stayed, so the card promised two and the bar counted three.
export const WIZARD_STEP_COUNT: Record<CoffeeWizardMode, number> = {
  basic: wizardSteps("basic", false).length,
  complete: wizardSteps("complete", false).length,
};
