/**
 * How many cups one logged brew put in front of you.
 *
 * The same three-step fallback the stats SQL uses (see stats_cup_totals in
 * 0033): the number you recorded, or a moka pot's size — which *is* that
 * number, in the only units a moka pot has — or one, because a brew you
 * logged before the column existed was still a coffee you drank.
 *
 * Kept here rather than inlined at each call site so the bag total and the
 * year total can never drift into counting differently.
 */
export type CupCountable = {
  cup_count?: number | null;
  moka_cup_size?: number | null;
};

export function cupsForAttempt(attempt: CupCountable): number {
  return attempt.cup_count ?? attempt.moka_cup_size ?? 1;
}

export function sumCups(attempts: CupCountable[]): number {
  return attempts.reduce((total, attempt) => total + cupsForAttempt(attempt), 0);
}
