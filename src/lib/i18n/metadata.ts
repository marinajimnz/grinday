import "server-only";
import type { Metadata } from "next";
import type { Dictionary } from "./dictionaries/es";
import { getDictionary } from "./get-dictionary";
import { getLocale } from "./locale";

// A page's tab title, in the account's language. The root layout adds
// " · Grindaily" to whatever this returns. Usage:
//   export const generateMetadata = titleFrom((d) => d.coffees.title);
export function titleFrom(pick: (dict: Dictionary) => string) {
  return async function generateMetadata(): Promise<Metadata> {
    return { title: pick(getDictionary(await getLocale())) };
  };
}
