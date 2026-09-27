import { HANDLE_PATTERN } from "@/lib/validation/profile";

/**
 * A starting point for someone picking their @handle, from their display
 * name: "Lucía V60" → "lucia_v60". Only a suggestion — it may already be
 * taken or reserved, which saving will say.
 */
export function suggestHandle(displayName: string | null | undefined): string {
  const base = (displayName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30)
    .replace(/_+$/, "");
  return HANDLE_PATTERN.test(base) ? base : "";
}
