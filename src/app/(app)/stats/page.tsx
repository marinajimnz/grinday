import { SquareChartGantt, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getExtractionDistribution,
  getFrequentNotes,
  getGrindDistribution,
  getStatsByDimension,
  getTopCoffees,
  getTotalRatedAttempts,
} from "@/features/stats/queries";
import { DIMENSION_CONFIG, formatDimensionLabel } from "@/features/stats/constants";
import { StatCard } from "@/components/stats/StatCard";
import { StatBarList } from "@/components/stats/StatBarList";
import { StatsDateFilter } from "@/components/stats/StatsDateFilter";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const range = { from, to };

  const supabase = await createClient();

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
      <h1 className="font-display text-3xl text-ink">Estadísticas</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Preferencias y patrones descriptivos — nunca recomendaciones.
      </p>

      <div className="mt-6">
        <StatsDateFilter />
      </div>

      {totalRated < 3 ? (
        <div className="mt-8">
          <EmptyState
            icon={SquareChartGantt}
            title="Datos insuficientes"
            description="Necesitas al menos 3 intentos puntuados (con puntuación general) para ver estadísticas fiables. Puntúa tus próximos intentos desde su ficha."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <StatCard
            title="Top cafés"
            description="Por puntuación media (mínimo 3 intentos puntuados)"
            empty={topCoffees.length === 0}
          >
            <StatBarList
              items={topCoffees.map((c) => ({
                key: c.coffee_id,
                label: c.has_preferred ? `★ ${c.name}` : c.name,
                value: c.avg_rating,
                displayValue: `${c.avg_rating.toFixed(1)}/5 (${c.rated_count})`,
              }))}
            />
            {topCoffees.some((c) => c.has_preferred) && (
              <p className="mt-3 flex items-center gap-1 text-xs text-ink-muted">
                <Star aria-hidden className="size-3 fill-coffee text-coffee" />
                tiene receta preferida marcada
              </p>
            )}
          </StatCard>

          {DIMENSION_CONFIG.map((dim, i) => {
            const rows = dimensionResults[i];
            return (
              <StatCard key={dim.key} title={dim.title} empty={rows.length === 0}>
                <StatBarList
                  items={rows.map((r) => ({
                    key: r.label,
                    label: formatDimensionLabel(dim.key, r.label),
                    value: r.avg_rating,
                    displayValue: `${r.avg_rating.toFixed(1)}/5 (${r.rated_count})`,
                  }))}
                />
              </StatCard>
            );
          })}

          <StatCard
            title="Notas más frecuentes"
            description="Entre cafés con puntuación media alta (≥4/5, mínimo 3 intentos)"
            empty={frequentNotes.length === 0}
          >
            <StatBarList
              items={frequentNotes.map((n) => ({
                key: n.note,
                label: n.note,
                value: n.coffee_count,
                displayValue: `${n.coffee_count} ${n.coffee_count === 1 ? "café" : "cafés"}`,
              }))}
            />
          </StatCard>

          <StatCard
            title="Distribución de extracción"
            description="Segundos de extracción entre intentos puntuados — solo descriptivo"
            empty={extractionDist.length === 0}
          >
            <StatBarList
              items={extractionDist.map((d) => ({
                key: String(d.bucket),
                label: `${d.bucket} s`,
                value: d.count,
                displayValue: `${d.count} ${d.count === 1 ? "intento" : "intentos"}`,
              }))}
            />
          </StatCard>

          <StatCard
            title="Distribución de molido"
            description="grind_setting entre intentos puntuados — solo descriptivo"
            empty={grindDist.length === 0}
          >
            <StatBarList
              items={grindDist.map((d) => ({
                key: String(d.bucket),
                label: String(d.bucket),
                value: d.count,
                displayValue: `${d.count} ${d.count === 1 ? "intento" : "intentos"}`,
              }))}
            />
          </StatCard>
        </div>
      )}
    </div>
  );
}
