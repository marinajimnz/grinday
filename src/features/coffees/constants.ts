export const ROAST_LEVELS = ["light", "medium", "dark", "custom"] as const;

export const ROAST_LEVEL_LABELS: Record<(typeof ROAST_LEVELS)[number], string> = {
  light: "Claro",
  medium: "Medio",
  dark: "Oscuro",
  custom: "Otro",
};

export const PROCESS_OPTIONS = [
  "washed",
  "natural",
  "honey",
  "anaerobic",
  "other",
] as const;

export const PROCESS_LABELS: Record<(typeof PROCESS_OPTIONS)[number], string> = {
  washed: "Lavado",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaeróbico",
  other: "Otro",
};

export const BAG_STATUSES = ["sealed", "open", "finished", "archived"] as const;

export const BAG_STATUS_LABELS: Record<(typeof BAG_STATUSES)[number], string> = {
  sealed: "Sin abrir",
  open: "Abierta",
  finished: "Terminada",
  archived: "Archivada",
};

export const INVENTORY_MODES = ["none", "manual_grams", "approximate_shots"] as const;

export const INVENTORY_MODE_LABELS: Record<(typeof INVENTORY_MODES)[number], string> = {
  none: "Sin seguimiento",
  manual_grams: "Gramos (báscula)",
  approximate_shots: "Aproximado por shots",
};

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

export const MEDIA_KIND_LABELS: Record<(typeof MEDIA_KINDS)[number], string> = {
  package_front: "Frente del paquete",
  package_back: "Reverso del paquete",
  package_detail: "Detalle",
  espresso: "Espresso",
  setup: "Setup",
  other: "Otra",
};
