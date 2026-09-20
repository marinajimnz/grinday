"use client";

import {
  CoffeeAltitudeFields as AltitudeFields,
  CoffeeNameAndRoasterFields,
  CoffeeOriginFields as OriginFields,
  CoffeeProcessAndRoastFields,
  CoffeeRoastLevelField,
  CoffeeTastingNotesField,
  CoffeeVarietiesField,
  type CoffeeFieldProps,
} from "../coffeeFields";

// The wizard's grouping of the blocks in ../coffeeFields — one step's worth
// each. The fields themselves live there, shared with the edit form, which
// asks for the same coffee on a single sheet.
export type CoffeeStepProps = CoffeeFieldProps;

// Complete mode, step 1: name + roaster — also the fields the duplicate-coffee
// check runs on, in both modes.
export const CoffeeBasicsFields = CoffeeNameAndRoasterFields;

// Complete mode, step 2: country, region, farm, producer.
export const CoffeeOriginFields = OriginFields;

// Complete mode, step 3: varieties, process, roast level, tasting notes.
export function CoffeeProfileFields({ register, control, errors }: CoffeeStepProps) {
  return (
    <div className="space-y-4">
      <CoffeeVarietiesField register={register} control={control} />
      <CoffeeProcessAndRoastFields register={register} errors={errors} />
      <CoffeeTastingNotesField register={register} control={control} />
    </div>
  );
}

// Complete mode, step 4: altitude range.
export const CoffeeAltitudeFields = AltitudeFields;

// Basic mode's only coffee step: name, roaster, roast level.
export function CoffeeBasicModeFields({ register, errors }: CoffeeStepProps) {
  return (
    <div className="space-y-4">
      <CoffeeNameAndRoasterFields register={register} errors={errors} />
      <CoffeeRoastLevelField register={register} errors={errors} />
    </div>
  );
}
