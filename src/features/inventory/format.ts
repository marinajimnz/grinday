import type { Dictionary } from "@/lib/i18n/dictionaries/es";

type BagInventoryFields = {
  inventory_mode: string;
  remaining_g: number | null;
  estimated_dose_g: number | null;
};

/**
 * §7.2: "El inventario aproximado debe estar etiquetado como 'aprox.',
 * nunca presentarse como medición exacta." manual_grams is ledger-tracked
 * from what the user actually weighed, so it's shown as a plain figure;
 * approximate_shots never claims that precision.
 *
 * `dict` is required. It used to default to the Spanish dictionary, which
 * meant importing it as a value here — and this module is imported by
 * BagInventoryRow, a Client Component, so the whole 595-line dictionary
 * (recipes, settings, the timer, everything) was bundled into the browser:
 * 22 kB of it, shipped to English viewers too. Both real call sites already
 * passed the resolved dictionary; only the tests leaned on the default.
 */
export function formatRemaining(bag: BagInventoryFields, dict: Dictionary): string {
  if (bag.inventory_mode === "none" || bag.remaining_g == null) {
    return dict.inventory.noTracking;
  }
  if (bag.inventory_mode === "approximate_shots") {
    const shots = bag.estimated_dose_g ? Math.floor(bag.remaining_g / bag.estimated_dose_g) : null;
    return shots !== null
      ? `${dict.inventory.approx} ${shots} ${shots === 1 ? dict.inventory.shot : dict.inventory.shots} (~${Math.round(bag.remaining_g)} g)`
      : `${dict.inventory.approx} ${Math.round(bag.remaining_g)} g`;
  }
  return `${Math.round(bag.remaining_g)} g`;
}
