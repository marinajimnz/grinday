"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { loadDashboardSnapshot, listPendingDraftIds, type DashboardSnapshot } from "@/features/dashboard/snapshot";

export default function OfflinePage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<string[]>([]);

  useEffect(() => {
    // localStorage doesn't exist during SSR/prerender — this can only be
    // read client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(loadDashboardSnapshot());
    setPendingDrafts(listPendingDraftIds());
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-2 text-ink-muted">
        <WifiOff aria-hidden className="size-5" />
        <h1 className="font-display text-2xl text-ink">Sin conexión</h1>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Esta pantalla se muestra cuando no hay red. Lo último que se pudo cargar sigue aquí.
      </p>

      {snapshot && (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Café activo (guardado localmente)
          </p>
          <p className="mt-1 text-sm text-ink-muted">{snapshot.roaster}</p>
          <p className="font-display text-2xl text-ink">{snapshot.coffeeName}</p>
          {snapshot.lastAttemptNo && (
            <p className="mt-2 text-sm text-ink-muted">
              Último intento: #{snapshot.lastAttemptNo}
              {snapshot.lastAttemptRating ? ` · ${snapshot.lastAttemptRating}/5` : ""}
            </p>
          )}
        </div>
      )}

      {pendingDrafts.length > 0 && (
        <div className="mt-4 rounded-card border border-border bg-canvas p-5">
          <p className="text-sm text-ink">
            {pendingDrafts.length === 1
              ? "Tienes un borrador de intento guardado en este dispositivo."
              : `Tienes ${pendingDrafts.length} borradores de intento guardados en este dispositivo.`}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Se sincronizarán solos en cuanto vuelva la conexión — no hace falta que hagas nada.
          </p>
        </div>
      )}

      {!snapshot && pendingDrafts.length === 0 && (
        <p className="mt-6 text-sm text-ink-muted">
          Todavía no hay nada guardado localmente para mostrar sin conexión.
        </p>
      )}

      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
      >
        Reintentar
      </Link>
    </div>
  );
}
