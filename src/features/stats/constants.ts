import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function getDimensionConfig(dict: Dictionary) {
  return [
    { key: "country", title: dict.stats.byCountry },
    { key: "process", title: dict.stats.byProcess },
    { key: "roast_level", title: dict.stats.byRoast },
    { key: "roaster", title: dict.stats.byRoaster },
  ] as const;
}

export function formatDimensionLabel(dimension: string, label: string, dict: Dictionary): string {
  if (dimension === "roast_level") {
    return dict.enums.roastLevel[label as keyof typeof dict.enums.roastLevel] ?? label;
  }
  return label;
}
