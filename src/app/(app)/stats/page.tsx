import { SquareChartGantt } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function StatsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Estadísticas</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Preferencias y patrones descriptivos, sin recomendaciones.
      </p>
      <div className="mt-8">
        <EmptyState
          icon={SquareChartGantt}
          title="Estadísticas — Fase 6"
          description="Necesitan historial de intentos puntuados, que todavía no existe."
        />
      </div>
    </div>
  );
}
