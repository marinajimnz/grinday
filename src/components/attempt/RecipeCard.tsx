import Link from "next/link";
import { Star } from "lucide-react";
import type { BrewAttemptRow } from "@/features/attempts/queries";

export function RecipeCard({ attempt }: { attempt: BrewAttemptRow }) {
  return (
    <div className="rounded-card border border-coffee/40 bg-surface p-5">
      <div className="flex items-center gap-1.5 text-coffee">
        <Star aria-hidden className="size-4 fill-coffee" />
        <span className="text-xs font-medium uppercase tracking-wide">Receta preferida</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {attempt.grind_setting ?? "—"}
          </p>
          <p className="text-xs text-ink-muted">Molido</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {attempt.grind_seconds ?? "—"}s
          </p>
          <p className="text-xs text-ink-muted">Molienda</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {attempt.extraction_ms ? `${(attempt.extraction_ms / 1000).toFixed(1)}s` : "—"}
          </p>
          <p className="text-xs text-ink-muted">Extracción</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/attempts/${attempt.id}`}
          className="min-h-11 flex-1 rounded-input border border-border px-4 text-center text-sm font-medium leading-[2.75rem] text-ink"
        >
          Ver intento #{attempt.attempt_no}
        </Link>
        <Link
          href={`/attempts/new?coffeeBagId=${attempt.coffee_bag_id}&duplicateFrom=${attempt.id}`}
          className="min-h-11 flex-1 rounded-input bg-ink px-4 text-center text-sm font-medium leading-[2.75rem] text-surface"
        >
          Preparar con esta receta
        </Link>
      </div>
    </div>
  );
}
