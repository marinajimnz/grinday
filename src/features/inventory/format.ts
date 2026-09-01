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
 */
export function formatRemaining(bag: BagInventoryFields): string {
  if (bag.inventory_mode === "none" || bag.remaining_g == null) {
    return "Sin seguimiento";
  }
  if (bag.inventory_mode === "approximate_shots") {
    const shots = bag.estimated_dose_g ? Math.floor(bag.remaining_g / bag.estimated_dose_g) : null;
    return shots !== null
      ? `aprox. ${shots} ${shots === 1 ? "shot" : "shots"} (~${Math.round(bag.remaining_g)} g)`
      : `aprox. ${Math.round(bag.remaining_g)} g`;
  }
  return `${Math.round(bag.remaining_g)} g`;
}
