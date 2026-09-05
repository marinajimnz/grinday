import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 text-center">
      <p className="truncate text-xl font-semibold tabular-nums text-ink" title={value}>
        {value}
      </p>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}

export async function DashboardStats({
  totalBrews,
  avgRating,
  favoriteMethod,
}: {
  totalBrews: number;
  avgRating: number | null;
  favoriteMethod: string | null;
}) {
  const dict = getDictionary(await getLocale());

  const favoriteLabel = favoriteMethod
    ? (dict.equipment.methodLabels[favoriteMethod as keyof typeof dict.equipment.methodLabels] ??
      favoriteMethod)
    : "—";

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile value={String(totalBrews)} label={dict.dashboard.brews} />
      <StatTile value={avgRating != null ? avgRating.toFixed(1) : "—"} label={dict.dashboard.average} />
      <StatTile value={favoriteLabel} label={dict.dashboard.favorite} />
    </div>
  );
}
