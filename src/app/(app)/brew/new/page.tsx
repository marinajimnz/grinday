import { Timer } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function BrewNewPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Preparar</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Elegir café/bolsa, receta base y entrar en modo temporizador.
      </p>
      <div className="mt-8">
        <EmptyState
          icon={Timer}
          title="Modo preparación — Fase 3"
          description="El temporizador de extracción llega junto con los intentos, en fases posteriores."
        />
      </div>
    </div>
  );
}
