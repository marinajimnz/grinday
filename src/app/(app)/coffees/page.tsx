import { Library } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CoffeesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Cafés</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Biblioteca, búsqueda, filtros, bolsas e inventario.
      </p>
      <div className="mt-8">
        <EmptyState
          icon={Library}
          title="Biblioteca de cafés — Fase 1"
          description="El alta manual de cafés y bolsas se construye en la siguiente fase."
        />
      </div>
    </div>
  );
}
