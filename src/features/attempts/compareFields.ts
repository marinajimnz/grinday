import {
  BASKET_SIZE_LABELS,
  BASKET_WALL_LABELS,
  DOSE_FEEDBACK_LABELS,
  DOSE_MODE_LABELS,
  PRESSURE_OBSERVATION_LABELS,
  SHOT_MODE_LABELS,
} from "./constants";
import type { BrewAttemptRow } from "./queries";

export type CompareField = {
  key: string;
  label: string;
  group: "technical" | "sensory";
  format: (attempt: BrewAttemptRow) => string;
};

function fallback(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export const COMPARE_FIELDS: CompareField[] = [
  { key: "grind_setting", label: "Molido", group: "technical", format: (a) => fallback(a.grind_setting) },
  { key: "grind_seconds", label: "Molienda (s)", group: "technical", format: (a) => fallback(a.grind_seconds) },
  {
    key: "dose_mode",
    label: "Dosificación",
    group: "technical",
    format: (a) => fallback(a.dose_mode && DOSE_MODE_LABELS[a.dose_mode as keyof typeof DOSE_MODE_LABELS]),
  },
  {
    key: "dose_feedback",
    label: "Feedback de dosis",
    group: "technical",
    format: (a) =>
      fallback(a.dose_feedback && DOSE_FEEDBACK_LABELS[a.dose_feedback as keyof typeof DOSE_FEEDBACK_LABELS]),
  },
  { key: "used_bit_more", label: "A Bit More", group: "technical", format: (a) => (a.used_bit_more ? "Sí" : "No") },
  {
    key: "basket_size",
    label: "Cesta",
    group: "technical",
    format: (a) => fallback(a.basket_size && BASKET_SIZE_LABELS[a.basket_size as keyof typeof BASKET_SIZE_LABELS]),
  },
  {
    key: "basket_wall",
    label: "Pared",
    group: "technical",
    format: (a) => fallback(a.basket_wall && BASKET_WALL_LABELS[a.basket_wall as keyof typeof BASKET_WALL_LABELS]),
  },
  {
    key: "temperature_offset_c",
    label: "Offset temperatura",
    group: "technical",
    format: (a) => (a.temperature_offset_c != null ? `${a.temperature_offset_c} °C` : "—"),
  },
  {
    key: "shot_mode",
    label: "Modo de shot",
    group: "technical",
    format: (a) => fallback(a.shot_mode && SHOT_MODE_LABELS[a.shot_mode as keyof typeof SHOT_MODE_LABELS]),
  },
  {
    key: "extraction_ms",
    label: "Extracción",
    group: "technical",
    format: (a) => (a.extraction_ms ? `${(a.extraction_ms / 1000).toFixed(1)} s` : "—"),
  },
  {
    key: "preinfusion_ms",
    label: "Preinfusión",
    group: "technical",
    format: (a) => (a.preinfusion_ms ? `${a.preinfusion_ms} ms` : "—"),
  },
  {
    key: "pressure_observation",
    label: "Presión observada",
    group: "technical",
    format: (a) =>
      fallback(
        a.pressure_observation &&
          PRESSURE_OBSERVATION_LABELS[a.pressure_observation as keyof typeof PRESSURE_OBSERVATION_LABELS],
      ),
  },
  { key: "input_weight_g", label: "Entrada (g)", group: "technical", format: (a) => fallback(a.input_weight_g) },
  { key: "output_weight_g", label: "Salida (g)", group: "technical", format: (a) => fallback(a.output_weight_g) },
  { key: "output_volume_ml", label: "Volumen (ml)", group: "technical", format: (a) => fallback(a.output_volume_ml) },

  { key: "acidity", label: "Acidez", group: "sensory", format: (a) => fallback(a.acidity) },
  { key: "sweetness", label: "Dulzor", group: "sensory", format: (a) => fallback(a.sweetness) },
  { key: "bitterness", label: "Amargor", group: "sensory", format: (a) => fallback(a.bitterness) },
  { key: "body", label: "Cuerpo", group: "sensory", format: (a) => fallback(a.body) },
  { key: "intensity", label: "Intensidad", group: "sensory", format: (a) => fallback(a.intensity) },
  { key: "balance", label: "Balance", group: "sensory", format: (a) => fallback(a.balance) },
  { key: "overall_rating", label: "Puntuación general", group: "sensory", format: (a) => fallback(a.overall_rating) },
];
