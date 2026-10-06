import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconFavorita } from "@/components/icons/pencil-icons";
import {
  getCupTotals,
  getCupsByBucket,
  getExtractionDistribution,
  getFrequentNotes,
  getGrindDistribution,
  getPeriodHighlights,
  getStatsByDimension,
  getStatsByMethod,
  getTopCoffees,
  getTotalRatedAttempts,
} from "@/features/stats/queries";
import { getDimensionConfig, formatDimensionLabel } from "@/features/stats/constants";
import {
  DEFAULT_STATS_PERIOD,
  getPeriodRange,
  isStatsPeriod,
  type StatsPeriod,
} from "@/features/stats/period";
import { StatBarList } from "@/components/stats/StatBarList";
import { StatsPeriodTabs } from "@/components/stats/StatsPeriodTabs";
import { CupsBarChart } from "@/components/stats/CupsBarChart";
import { StatsHighlights } from "@/components/stats/StatsHighlights";
import { SettingsAccordionCard } from "@/components/settings/SettingsAccordionCard";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.stats.title);

const PERIOD_HEADING: Record<StatsPeriod, keyof Dictionary["stats"]> = {
  week: "yourWeek",
  month: "yourMonth",
  year: "yourYear",
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = isStatsPeriod(rawPeriod) ? rawPeriod : DEFAULT_STATS_PERIOD;
  const periodRange = getPeriodRange(period, new Date());
  const range = { from: periodRange.from, to: periodRange.to };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const DIMENSION_CONFIG = getDimensionConfig(dict);

  const [
    totals,
    chartBuckets,
    highlights,
    totalRated,
    topCoffees,
    methodStats,
    dimensionResults,
    frequentNotes,
    extractionDist,
    grindDist,
  ] = await Promise.all([
    getCupTotals(supabase, range),
    getCupsByBucket(supabase, range, periodRange.bucket),
    getPeriodHighlights(supabase, range),
    getTotalRatedAttempts(supabase, user.id, range),
    getTopCoffees(supabase, range),
    getStatsByMethod(supabase, range),
    Promise.all(DIMENSION_CONFIG.map((d) => getStatsByDimension(supabase, d.key, range))),
    getFrequentNotes(supabase, range),
    getExtractionDistribution(supabase, range),
    getGrindDistribution(supabase, range),
  ]);

  // The year's label is the year itself; a week or a month is named by the
  // heading alone, since "TU SEMANA EN CAFÉ · 38" would mean nothing.
  const eyebrow =
    period === "year"
      ? `${dict.stats[PERIOD_HEADING[period]]} · ${periodRange.from.slice(0, 4)}`
      : dict.stats[PERIOD_HEADING[period]];

  const ratedSections: { title: string; description?: string; body: React.ReactNode }[] = [
    {
      title: dict.stats.topCoffees,
      description: dict.stats.topCoffeesDescription,
      body: topCoffees.length ? (
        <>
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
        </>
      ) : null,
    },
    {
      title: dict.stats.byMethod,
      body: methodStats.length ? (
        <StatBarList
          items={methodStats.map((m) => ({
            key: m.method,
            label:
              dict.equipment.methodLabels[m.method as keyof typeof dict.equipment.methodLabels] ??
              m.method,
            value: m.avg_rating,
            displayValue: `${m.avg_rating.toFixed(1)}/5 (${m.rated_count})`,
          }))}
        />
      ) : null,
    },
    ...DIMENSION_CONFIG.map((dim, i) => {
      const rows = dimensionResults[i];
      return {
        title: dim.title,
        body: rows.length ? (
          <StatBarList
            items={rows.map((r) => ({
              key: r.label,
              label: formatDimensionLabel(dim.key, r.label, dict),
              value: r.avg_rating,
              displayValue: `${r.avg_rating.toFixed(1)}/5 (${r.rated_count})`,
            }))}
          />
        ) : null,
      };
    }),
    {
      title: dict.stats.frequentNotes,
      description: dict.stats.frequentNotesDescription,
      body: frequentNotes.length ? (
        <StatBarList
          items={frequentNotes.map((n) => ({
            key: n.note,
            label: n.note,
            value: n.coffee_count,
            displayValue: `${n.coffee_count} ${n.coffee_count === 1 ? dict.stats.coffee : dict.stats.coffeesPlural}`,
          }))}
        />
      ) : null,
    },
    {
      title: dict.stats.extractionDistribution,
      description: dict.stats.extractionDistributionDescription,
      body: extractionDist.length ? (
        <StatBarList
          items={extractionDist.map((d) => ({
            key: String(d.bucket),
            label: `${d.bucket} s`,
            value: d.count,
            displayValue: `${d.count} ${d.count === 1 ? dict.stats.attempt : dict.stats.attemptsPlural}`,
          }))}
        />
      ) : null,
    },
    {
      title: dict.stats.grindDistribution,
      description: dict.stats.grindDistributionDescription,
      body: grindDist.length ? (
        <StatBarList
          items={grindDist.map((d) => ({
            key: String(d.bucket),
            label: String(d.bucket),
            value: d.count,
            displayValue: `${d.count} ${d.count === 1 ? dict.stats.attempt : dict.stats.attemptsPlural}`,
          }))}
        />
      ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <StatsPeriodTabs active={period} />

      {/* The count leads, because it needs nothing of you: no ratings, no
          three-attempt minimum, just brews. Everything below it is the old
          page, which does need all that and says so when it's missing. */}
      <section className="mt-8 text-center">
        {/* The eyebrow is the page's heading. A separate "Estadísticas"
            title above it would name the tab you already tapped and push
            the number — the thing you came for — further down. */}
        <h1 className="text-xs font-medium uppercase tracking-widest text-ink-muted">{eyebrow}</h1>
        <p className="mt-2 font-display text-6xl leading-none text-ink">{totals.cups}</p>
        <p className="mt-2 text-sm text-ink-muted">
          {totals.cups === 1 ? dict.stats.cupBrewed : dict.stats.cupsBrewed}
        </p>
      </section>

      {totals.cups === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-muted">{dict.stats.noCupsYet}</p>
      ) : (
        <>
          <div className="mt-6">
            <CupsBarChart range={periodRange} buckets={chartBuckets} dict={dict} locale={locale} />
          </div>
          <div className="mt-6">
            <StatsHighlights highlights={highlights} dict={dict} />
          </div>
        </>
      )}

      <h2 className="mt-10 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {dict.stats.breakdowns}
      </h2>
      {/* The old page's standing disclaimer. It belongs to these lists,
          which rank things by rating, and not to the count above them. */}
      <p className="mt-1 text-xs text-ink-muted">{dict.stats.subtitle}</p>
      <div className="mt-3 space-y-2">
        {ratedSections.map((section) => (
          <SettingsAccordionCard key={section.title} title={section.title}>
            {section.description && (
              <p className="mb-4 text-xs text-ink-muted">{section.description}</p>
            )}
            {section.body ?? (
              <p className="text-sm text-ink-muted">
                {totalRated < 3 ? dict.stats.insufficientDescription : dict.stats.insufficientGroup}
              </p>
            )}
          </SettingsAccordionCard>
        ))}
      </div>
    </div>
  );
}
