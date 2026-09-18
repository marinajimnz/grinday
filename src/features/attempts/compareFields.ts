import type { BrewAttemptRow } from "./queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { formatDuration } from "@/features/brew/formatTime";

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
    {
      key: "method",
      label: dict.attempts.method,
      group: "technical",
      format: (a) => dict.equipment.methodLabels[a.method as keyof typeof dict.equipment.methodLabels] ?? a.method,
    },
    { key: "dose_g", label: dict.brew.doseG, group: "technical", format: (a) => (a.dose_g != null ? `${a.dose_g} g` : "—") },
    { key: "water_g", label: dict.brew.waterG, group: "technical", format: (a) => (a.water_g != null ? `${a.water_g} g` : "—") },
    {
      key: "dilution_water_g",
      label: dict.brew.dilutionWaterG,
      group: "technical",
      format: (a) => (a.dilution_water_g != null ? `${a.dilution_water_g} g` : "—"),
    },
    {
      key: "target_weight_g",
      label: dict.brew.targetWeightG,
      group: "technical",
      format: (a) => (a.target_weight_g != null ? `${a.target_weight_g} g` : "—"),
    },
    { key: "output_weight_g", label: dict.brew.outputWeight, group: "technical", format: (a) => fallback(a.output_weight_g) },
    {
      key: "temperature_c",
      label: dict.brew.temperatureC,
      group: "technical",
      format: (a) => (a.temperature_c != null ? `${a.temperature_c} °C` : "—"),
    },
    { key: "grind_setting", label: dict.brew.grindSetting, group: "technical", format: (a) => fallback(a.grind_setting) },
    {
      key: "extraction_ms",
      label: dict.attempts.extraction,
      group: "technical",
      format: (a) => (a.extraction_ms ? formatDuration(a.extraction_ms) : "—"),
    },
    {
      key: "target_time_ms",
      label: dict.brew.target,
      group: "technical",
      format: (a) => (a.target_time_ms ? formatDuration(a.target_time_ms) : "—"),
    },
    {
      key: "tds_percent",
      label: dict.brew.tds,
      group: "technical",
      format: (a) => (a.tds_percent != null ? `${a.tds_percent}%` : "—"),
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
