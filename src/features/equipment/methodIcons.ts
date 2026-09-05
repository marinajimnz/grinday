import {
  IconAeropress,
  IconChemex,
  IconEspresso,
  IconMoka,
  IconOtros,
  IconPrensa,
  IconV60,
} from "@/components/icons/pencil-icons";
import type { BrewMethod } from "./constants";

// Kept in its own plain (non "use client") module: a Server Component
// (RecentAttemptsList) needs this map too, and a plain object export from a
// client-boundary file doesn't survive that import — only component
// references do.
export const METHOD_ICONS: Record<BrewMethod, typeof IconEspresso> = {
  espresso: IconEspresso,
  v60: IconV60,
  chemex: IconChemex,
  aeropress: IconAeropress,
  prensa: IconPrensa,
  moka: IconMoka,
  otros: IconOtros,
};
