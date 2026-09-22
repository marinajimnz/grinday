/**
 * Which bag a new brew would come out of: the one that's open, or failing
 * that a sealed one waiting to be. Nothing else — a finished or archived
 * bag has nothing left to brew, and a coffee down to those is not offered
 * in /brew/new at all.
 *
 * Its own module rather than a closure inside queries.ts, which is
 * server-only: this is the rule that decides what the picker shows, and it
 * was wrong before (it fell back to "whatever bag exists").
 */
export function pickTargetBag<T extends { status: string }>(bags: T[]): T | undefined {
  return bags.find((b) => b.status === "open") ?? bags.find((b) => b.status === "sealed");
}
