"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coffee as CoffeeIcon, Pencil } from "lucide-react";
import { EditCoffeeForm } from "./EditCoffeeForm";
import { ROAST_LEVEL_LABELS, type ROAST_LEVELS } from "@/features/coffees/constants";
import { archiveCoffeeAction } from "@/features/coffees/actions";
import type { CoffeeRow } from "@/features/coffees/queries";

export function CoffeeDetailPanel({ coffee }: { coffee: CoffeeRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isArchiving, startArchive] = useTransition();

  if (editing) {
    return (
      <EditCoffeeForm
        coffee={coffee}
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
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-input bg-canvas">
            <CoffeeIcon aria-hidden className="size-7 text-coffee" />
          </div>
          <div>
            <p className="text-sm text-ink-muted">{coffee.roaster}</p>
            <h1 className="font-display text-2xl text-ink">{coffee.name}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink"
        >
          <Pencil aria-hidden className="size-4" />
          Editar
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {coffee.country && (
          <div>
            <dt className="text-ink-muted">País</dt>
            <dd className="text-ink">{coffee.country}</dd>
          </div>
        )}
        {coffee.region && (
          <div>
            <dt className="text-ink-muted">Región</dt>
            <dd className="text-ink">{coffee.region}</dd>
          </div>
        )}
        {coffee.farm && (
          <div>
            <dt className="text-ink-muted">Finca</dt>
            <dd className="text-ink">{coffee.farm}</dd>
          </div>
        )}
        {coffee.producer && (
          <div>
            <dt className="text-ink-muted">Productor</dt>
            <dd className="text-ink">{coffee.producer}</dd>
          </div>
        )}
        {coffee.process && (
          <div>
            <dt className="text-ink-muted">Proceso</dt>
            <dd className="text-ink">{coffee.process}</dd>
          </div>
        )}
        {coffee.roast_level && (
          <div>
            <dt className="text-ink-muted">Tueste</dt>
            <dd className="text-ink">
              {ROAST_LEVEL_LABELS[coffee.roast_level as (typeof ROAST_LEVELS)[number]] ??
                coffee.roast_level}
            </dd>
          </div>
        )}
        {(coffee.altitude_min_m || coffee.altitude_max_m) && (
          <div>
            <dt className="text-ink-muted">Altitud</dt>
            <dd className="text-ink">
              {coffee.altitude_min_m ?? "?"}–{coffee.altitude_max_m ?? "?"} m
            </dd>
          </div>
        )}
      </dl>

      {coffee.varieties.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-ink-muted">Variedades</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffee.varieties.map((v) => (
              <span key={v} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {coffee.tasting_notes.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-ink-muted">Notas de cata</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffee.tasting_notes.map((n) => (
              <span key={n} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={isArchiving}
        onClick={() => {
          if (!confirm(`¿Archivar “${coffee.name}”? No se borra ningún dato.`)) return;
          startArchive(async () => {
            await archiveCoffeeAction(coffee.id);
            router.push("/coffees");
          });
        }}
        className="mt-6 text-xs text-ink-muted underline disabled:opacity-60"
      >
        {isArchiving ? "Archivando..." : "Archivar café"}
      </button>
    </div>
  );
}
