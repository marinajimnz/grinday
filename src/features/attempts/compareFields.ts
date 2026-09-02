import type { BrewAttemptRow } from "./queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export type CompareField = {
  key: string;
  label: string;
  group: "technical" | "sensory";
  format: (attempt: BrewAttemptRow) => string;
};

function fallback(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export function getCompareFields(dict: Dictionary): CompareField[] {
  return [
    { key: "grind_setting", label: dict.brew.grindSetting, group: "technical", format: (a) => fallback(a.grind_setting) },
    {
      key: "grind_seconds",
      label: dict.attempts.grindSeconds,
      group: "technical",
      format: (a) => fallback(a.grind_seconds),
    },
    {
      key: "dose_mode",
      label: dict.brew.doseMode,
      group: "technical",
      format: (a) => fallback(a.dose_mode && dict.enums.doseMode[a.dose_mode as keyof typeof dict.enums.doseMode]),
    },
    {
      key: "dose_feedback",
      label: dict.brew.doseFeedback,
      group: "technical",
      format: (a) =>
        fallback(
          a.dose_feedback && dict.enums.doseFeedback[a.dose_feedback as keyof typeof dict.enums.doseFeedback],
        ),
    },
    {
      key: "used_bit_more",
      label: dict.attempts.aBitMore,
      group: "technical",
      format: (a) => (a.used_bit_more ? dict.common.yes : dict.common.no),
    },
    {
      key: "basket_size",
      label: dict.attempts.basketSize,
      group: "technical",
      format: (a) => fallback(a.basket_size && dict.enums.basketSize[a.basket_size as keyof typeof dict.enums.basketSize]),
    },
    {
      key: "basket_wall",
      label: dict.brew.basketWall,
      group: "technical",
      format: (a) => fallback(a.basket_wall && dict.enums.basketWall[a.basket_wall as keyof typeof dict.enums.basketWall]),
    },
    {
      key: "temperature_offset_c",
      label: dict.attempts.temperatureOffsetShort,
      group: "technical",
      format: (a) => (a.temperature_offset_c != null ? `${a.temperature_offset_c} °C` : "—"),
    },
    {
      key: "shot_mode",
      label: dict.brew.shotMode,
      group: "technical",
      format: (a) => fallback(a.shot_mode && dict.enums.shotMode[a.shot_mode as keyof typeof dict.enums.shotMode]),
    },
    {
      key: "extraction_ms",
      label: dict.attempts.extraction,
      group: "technical",
      format: (a) => (a.extraction_ms ? `${(a.extraction_ms / 1000).toFixed(1)} s` : "—"),
    },
    {
      key: "preinfusion_ms",
      label: dict.attempts.preinfusionShort,
      group: "technical",
      format: (a) => (a.preinfusion_ms ? `${a.preinfusion_ms} ms` : "—"),
    },
    {
      key: "pressure_observation",
      label: dict.attempts.pressureObservation,
      group: "technical",
      format: (a) =>
        fallback(
          a.pressure_observation &&
            dict.enums.pressureObservation[
              a.pressure_observation as keyof typeof dict.enums.pressureObservation
            ],
        ),
    },
    { key: "input_weight_g", label: dict.brew.inputWeight, group: "technical", format: (a) => fallback(a.input_weight_g) },
    { key: "output_weight_g", label: dict.brew.outputWeight, group: "technical", format: (a) => fallback(a.output_weight_g) },
    {
      key: "output_volume_ml",
      label: dict.brew.outputVolume,
      group: "technical",
      format: (a) => fallback(a.output_volume_ml),
    },

    { key: "acidity", label: dict.enums.tasteDimension.acidity, group: "sensory", format: (a) => fallback(a.acidity) },
    { key: "sweetness", label: dict.enums.tasteDimension.sweetness, group: "sensory", format: (a) => fallback(a.sweetness) },
    { key: "bitterness", label: dict.enums.tasteDimension.bitterness, group: "sensory", format: (a) => fallback(a.bitterness) },
    { key: "body", label: dict.enums.tasteDimension.body, group: "sensory", format: (a) => fallback(a.body) },
    { key: "intensity", label: dict.enums.tasteDimension.intensity, group: "sensory", format: (a) => fallback(a.intensity) },
    { key: "balance", label: dict.enums.tasteDimension.balance, group: "sensory", format: (a) => fallback(a.balance) },
    {
      key: "overall_rating",
      label: dict.brew.overallRating,
      group: "sensory",
      format: (a) => fallback(a.overall_rating),
    },
  ];
}
