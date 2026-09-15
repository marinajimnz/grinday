import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export type DeletionImpact = { bags?: number; attempts: number };

// Turns the counts behind a delete into the sentence the confirmation shows,
// so "esto no se puede deshacer" comes with what exactly is being undone:
// "Se eliminarán también 2 bolsas y 14 intentos, con sus fotos."
//
// Returns the "nothing to lose" line when there's no history at all, which is
// the reassuring case and reads worse as "se eliminarán 0 bolsas y 0 intentos".
export function formatDeletionImpact(dict: Dictionary, impact: DeletionImpact): string {
  const parts: string[] = [];
  if (impact.bags) {
    parts.push(`${impact.bags} ${impact.bags === 1 ? dict.coffees.bag : dict.coffees.bags}`);
  }
  if (impact.attempts) {
    parts.push(
      `${impact.attempts} ${impact.attempts === 1 ? dict.coffees.attempt : dict.coffees.attemptsPlural}`,
    );
  }

  if (!parts.length) return dict.coffees.deleteImpactNone;

  const list = parts.join(` ${dict.coffees.deleteImpactAnd} `);
  return `${dict.coffees.deleteImpactIntro} ${list}${dict.coffees.deleteImpactSuffix}`;
}
