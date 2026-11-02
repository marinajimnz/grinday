/**
 * Which cards the home page's recipe stack holds, in order: the coffee's
 * pinned recipe, the last attempt and the best of the week. One attempt
 * can be more than one of those — the last brew is often the best one too
 * — and it shows once, as the first of them.
 *
 * Its own plain module, apart from the server-only queries, so the rule can
 * be tested on its own.
 */
export type RecipeStackKind = "preferred" | "last" | "best";

export function buildRecipeStack<A extends { id: string }>(sources: {
  preferred: A | null;
  last: A | null;
  best: A | null;
}): { kind: RecipeStackKind; attempt: A }[] {
  const cards: { kind: RecipeStackKind; attempt: A }[] = [];
  for (const kind of ["preferred", "last", "best"] as const) {
    const attempt = sources[kind];
    if (attempt && !cards.some((c) => c.attempt.id === attempt.id)) cards.push({ kind, attempt });
  }
  return cards;
}

/**
 * Where the stack is after showing `top` and moving `step` cards, with the
 * closing "all your favourites" card counted in `length`. It wraps: after
 * the last card comes the first again.
 */
export function stackIndexAfter(top: number, step: number, length: number): number {
  if (length <= 0) return 0;
  return (((top + step) % length) + length) % length;
}
