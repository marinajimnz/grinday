import { ROAST_LEVEL_LABELS } from "@/features/coffees/constants";

export const DIMENSION_CONFIG = [
  { key: "country", title: "Por país" },
  { key: "process", title: "Por proceso" },
  { key: "roast_level", title: "Por tueste" },
  { key: "roaster", title: "Por tostador" },
] as const;

export function formatDimensionLabel(dimension: string, label: string): string {
  if (dimension === "roast_level") {
    return ROAST_LEVEL_LABELS[label as keyof typeof ROAST_LEVEL_LABELS] ?? label;
  }
  return label;
}
