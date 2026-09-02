import { SquareChartGantt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { IconFavorita } from "@/components/icons/pencil-icons";
import {
  getExtractionDistribution,
  getFrequentNotes,
  getGrindDistribution,
  getStatsByDimension,
  getTopCoffees,
  getTotalRatedAttempts,
} from "@/features/stats/queries";
import { getDimensionConfig, formatDimensionLabel } from "@/features/stats/constants";
import { StatCard } from "@/components/stats/StatCard";
import { StatBarList } from "@/components/stats/StatBarList";
import { StatsDateFilter } from "@/components/stats/StatsDateFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const range = { from, to };

  const supabase = await createClient();
  const dict = getDictionary(await getLocale());
  const DIMENSION_CONFIG = getDimensionConfig(dict);

  const [totalRated, topCoffees, dimensionResults, frequentNotes, extractionDist, grindDist] =
    await Promise.all([
      getTotalRatedAttempts(supabase, range),
      getTopCoffees(supabase, range),
      Promise.all(DIMENSION_CONFIG.map((d) => getStatsByDimension(supabase, d.key, range))),
      getFrequentNotes(supabase, range),
      getExtractionDistribution(supabase, range),
      getGrindDistribution(supabase, range),
    ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.stats.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.stats.subtitle}</p>

      <div className="mt-6">
        <StatsDateFilter />
      </div>

      {totalRated < 3 ? (
        <div className="mt-8">
          <EmptyState
            icon={SquareChartGantt}
            title={dict.stats.insufficientTitle}
            description={dict.stats.insufficientDescription}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <StatCard
            title={dict.stats.topCoffees}
            description={dict.stats.topCoffeesDescription}
            empty={topCoffees.length === 0}
            dict={dict}
          >
            <StatBarList
              items={topCoffees.map((c) => ({
                key: c.coffee_id,
                label: c.has_preferred ? (
                  <span className="inline-flex items-center gap-1">
                    <IconFavorita aria-hidden className="size-3 shrink-0 text-coffee" />
                    {c.name}
                  </span>
                ) : (
                  c.name
                ),
                value: c.avg_rating,
                displayValue: `${c.avg_rating.toFixed(1)}/5 (${c.rated_count})`,
              }))}
            />
            {topCoffees.some((c) => c.has_preferred) && (
              <p className="mt-3 flex items-center gap-1 text-xs text-ink-muted">
                <IconFavorita aria-hidden className="size-3 text-coffee" />
                {dict.stats.hasPreferredRecipe}
              </p>
            )}
          </StatCard>

          {DIMENSION_CONFIG.map((dim, i) => {
            const rows = dimensionResults[i];
            return (
              <StatCard key={dim.key} title={dim.title} empty={rows.length === 0} dict={dict}>
                <StatBarList
                  items={rows.map((r) => ({
                    key: r.label,
                    label: formatDimensionLabel(dim.key, r.label, dict),
                    value: r.avg_rating,
                    displayValue: `${r.avg_rating.toFixed(1)}/5 (${r.rated_count})`,
                  }))}
                />
              </StatCard>
            );
          })}

          <StatCard
            title={dict.stats.frequentNotes}
            description={dict.stats.frequentNotesDescription}
            empty={frequentNotes.length === 0}
            dict={dict}
          >
            <StatBarList
              items={frequentNotes.map((n) => ({
                key: n.note,
                label: n.note,
                value: n.coffee_count,
                displayValue: `${n.coffee_count} ${n.coffee_count === 1 ? dict.stats.coffee : dict.stats.coffeesPlural}`,
              }))}
            />
          </StatCard>

          <StatCard
            title={dict.stats.extractionDistribution}
            description={dict.stats.extractionDistributionDescription}
            empty={extractionDist.length === 0}
            dict={dict}
          >
            <StatBarList
              items={extractionDist.map((d) => ({
                key: String(d.bucket),
                label: `${d.bucket} s`,
                value: d.count,
                displayValue: `${d.count} ${d.count === 1 ? dict.stats.attempt : dict.stats.attemptsPlural}`,
              }))}
            />
          </StatCard>

          <StatCard
            title={dict.stats.grindDistribution}
            description={dict.stats.grindDistributionDescription}
            empty={grindDist.length === 0}
            dict={dict}
          >
            <StatBarList
              items={grindDist.map((d) => ({
                key: String(d.bucket),
                label: String(d.bucket),
                value: d.count,
                displayValue: `${d.count} ${d.count === 1 ? dict.stats.attempt : dict.stats.attemptsPlural}`,
              }))}
            />
          </StatCard>
        </div>
      )}
    </div>
  );
}
