import Link from "next/link";
import { ChevronLeft, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAttemptsByIds } from "@/features/attempts/queries";
import { CompareView } from "@/components/attempt/CompareView";
import { EmptyState } from "@/components/ui/EmptyState";
import { MAX_COMPARE_ATTEMPTS, MIN_COMPARE_ATTEMPTS } from "@/features/attempts/constants";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE_ATTEMPTS);

  const supabase = await createClient();
  const attempts = ids.length >= MIN_COMPARE_ATTEMPTS ? await getAttemptsByIds(supabase, ids) : [];

  let preferredAttemptId: string | null = null;
  if (attempts.length) {
    const { data: coffee } = await supabase
      .from("coffees")
      .select("preferred_attempt_id")
      .eq("id", attempts[0].coffee_id)
      .maybeSingle();
    preferredAttemptId = coffee?.preferred_attempt_id ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {attempts.length > 0 && (
        <Link
          href={`/coffees/${attempts[0].coffee_id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Volver al café
        </Link>
      )}

      <h1 className="mt-2 font-display text-3xl text-ink">Comparar intentos</h1>

      <div className="mt-6">
        {attempts.length >= MIN_COMPARE_ATTEMPTS ? (
          <CompareView attempts={attempts} preferredAttemptId={preferredAttemptId} />
        ) : (
          <EmptyState
            icon={Scale}
            title="Nada que comparar"
            description="Selecciona entre 2 y 4 intentos desde la pestaña Intentos de un café."
          />
        )}
      </div>
    </div>
  );
}
