export const ROAST_LEVELS = ["light", "medium", "dark", "custom"] as const;

export const PROCESS_OPTIONS = [
  "washed",
  "natural",
  "honey",
  "anaerobic",
  "other",
] as const;

export const BAG_STATUSES = ["sealed", "open", "finished", "archived"] as const;

export const INVENTORY_MODES = ["none", "manual_grams", "approximate_shots"] as const;

export const MEDIA_KINDS = [
  "package_front",
  "package_back",
  "package_detail",
  "espresso",
  "setup",
  "other",
] as const;

export const PACKAGE_MEDIA_KINDS = [
  "package_front",
  "package_back",
  "package_detail",
  "other",
] as const;
