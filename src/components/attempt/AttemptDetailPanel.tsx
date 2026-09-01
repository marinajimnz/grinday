"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Star } from "lucide-react";
import { EditAttemptForm } from "./EditAttemptForm";
import {
  BASKET_SIZE_LABELS,
  BASKET_WALL_LABELS,
  DOSE_FEEDBACK_LABELS,
  DOSE_MODE_LABELS,
  PRESSURE_OBSERVATION_LABELS,
  SHOT_MODE_LABELS,
  TASTE_DIMENSIONS,
  TASTE_DIMENSION_LABELS,
} from "@/features/attempts/constants";
import { setPreferredAttemptAction } from "@/features/attempts/actions";
import type { BrewAttemptRow } from "@/features/attempts/queries";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export function AttemptDetailPanel({
  attempt,
  coffeeId,
  isPreferred,
}: {
  attempt: BrewAttemptRow;
  coffeeId: string;
  isPreferred: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isTogglingPreferred, startTogglePreferred] = useTransition();

  if (editing) {
    return (
      <EditAttemptForm
        attempt={attempt}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Intento #{attempt.attempt_no}</h1>
          <p className="text-xs text-ink-muted">
            {new Date(attempt.created_at).toLocaleString("es-ES")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink"
        >
          <Pencil aria-hidden className="size-4" />
          Corregir
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isTogglingPreferred}
          onClick={() =>
            startTogglePreferred(async () => {
              await setPreferredAttemptAction({
                coffeeId,
                attemptId: isPreferred ? null : attempt.id,
              });
              router.refresh();
            })
          }
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-coffee px-3 text-sm font-medium text-coffee disabled:opacity-60"
        >
          <Star aria-hidden className={isPreferred ? "size-4 fill-coffee" : "size-4"} />
          {isPreferred ? "Quitar de preferido" : "Marcar como preferido"}
        </button>

        <Link
          href={`/attempts/new?coffeeBagId=${attempt.coffee_bag_id}&duplicateFrom=${attempt.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink"
        >
          <Copy aria-hidden className="size-4" />
          Duplicar y ajustar
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Molido" value={attempt.grind_setting} />
        <Stat label="Segundos de molienda" value={attempt.grind_seconds} />
        <Stat
          label="Dosificación"
          value={
            attempt.dose_mode
              ? DOSE_MODE_LABELS[attempt.dose_mode as keyof typeof DOSE_MODE_LABELS]
              : null
          }
        />
        <Stat
          label="Feedback de dosis"
          value={
            attempt.dose_feedback
              ? DOSE_FEEDBACK_LABELS[attempt.dose_feedback as keyof typeof DOSE_FEEDBACK_LABELS]
              : null
          }
        />
        <Stat label="A Bit More" value={attempt.used_bit_more ? "Sí" : null} />
        <Stat
          label="Cesta"
          value={
            attempt.basket_size
              ? BASKET_SIZE_LABELS[attempt.basket_size as keyof typeof BASKET_SIZE_LABELS]
              : null
          }
        />
        <Stat
          label="Pared"
          value={
            attempt.basket_wall
              ? BASKET_WALL_LABELS[attempt.basket_wall as keyof typeof BASKET_WALL_LABELS]
              : null
          }
        />
        <Stat
          label="Offset temperatura"
          value={attempt.temperature_offset_c != null ? `${attempt.temperature_offset_c} °C` : null}
        />
        <Stat label="Muela superior" value={attempt.upper_burr_setting} />
        <Stat
          label="Modo de shot"
          value={
            attempt.shot_mode
              ? SHOT_MODE_LABELS[attempt.shot_mode as keyof typeof SHOT_MODE_LABELS]
              : null
          }
        />
        <Stat
          label="Extracción"
          value={attempt.extraction_ms ? `${(attempt.extraction_ms / 1000).toFixed(1)} s` : null}
        />
        <Stat label="Preinfusión" value={attempt.preinfusion_ms ? `${attempt.preinfusion_ms} ms` : null} />
        <Stat
          label="Presión observada"
          value={
            attempt.pressure_observation
              ? PRESSURE_OBSERVATION_LABELS[
                  attempt.pressure_observation as keyof typeof PRESSURE_OBSERVATION_LABELS
                ]
              : null
          }
        />
        <Stat label="Entrada" value={attempt.input_weight_g ? `${attempt.input_weight_g} g` : null} />
        <Stat label="Salida" value={attempt.output_weight_g ? `${attempt.output_weight_g} g` : null} />
        <Stat label="Volumen" value={attempt.output_volume_ml ? `${attempt.output_volume_ml} ml` : null} />
      </dl>

      {(TASTE_DIMENSIONS.some((d) => attempt[d] != null) || attempt.overall_rating) && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-ink-muted">Cata</p>
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TASTE_DIMENSIONS.map((dim) => (
              <Stat key={dim} label={TASTE_DIMENSION_LABELS[dim]} value={attempt[dim] ? `${attempt[dim]}/5` : null} />
            ))}
            <Stat label="Puntuación general" value={attempt.overall_rating ? `${attempt.overall_rating}/5` : null} />
          </dl>
        </div>
      )}

      {attempt.notes && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-ink-muted">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{attempt.notes}</p>
        </div>
      )}
    </div>
  );
}
