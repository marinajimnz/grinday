import Link from "next/link";
import { Coffee } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Inicio</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Tu café activo, último intento y accesos rápidos aparecerán aquí.
      </p>

      <div className="mt-8">
        <EmptyState
          icon={Coffee}
          title="Todavía no hay ningún café en tu diario"
          description="La biblioteca de cafés llega en la Fase 1. Mientras tanto, confirma tu máquina en Ajustes."
          action={
            <Link
              href="/settings/machines"
              className="mt-2 inline-flex min-h-11 items-center rounded-input bg-ink px-4 text-sm font-medium text-surface"
            >
              Ir a Ajustes → Máquinas
            </Link>
          }
        />
      </div>
    </div>
  );
}
