import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAttempt } from "@/features/attempts/queries";
import { CreateAttemptForm } from "@/components/attempt/CreateAttemptForm";

export default async function NewAttemptPage({
  searchParams,
}: {
  searchParams: Promise<{ coffeeBagId?: string; duplicateFrom?: string }>;
}) {
  const { coffeeBagId, duplicateFrom } = await searchParams;
  if (!coffeeBagId) notFound();

  const supabase = await createClient();

  const { data: bag } = await supabase
    .from("coffee_bags")
    .select("id, coffee:coffees(id, name, roaster)")
    .eq("id", coffeeBagId)
    .maybeSingle();
  if (!bag) notFound();

  const parentAttempt = duplicateFrom ? await getAttempt(supabase, duplicateFrom) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Link
        href={`/coffees/${bag.coffee.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {bag.coffee.roaster} · {bag.coffee.name}
      </Link>

      <h1 className="mt-4 font-display text-3xl text-ink">Nuevo intento</h1>
      <p className="mt-1 text-sm text-ink-muted">
        El temporizador integrado llega en una fase posterior; de momento registra el
        tiempo de extracción a mano si lo conoces.
      </p>

      <div className="mt-8">
        <CreateAttemptForm coffeeBagId={coffeeBagId} parentAttempt={parentAttempt} />
      </div>
    </div>
  );
}
