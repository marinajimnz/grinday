import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAttempt } from "@/features/attempts/queries";
import { AttemptDetailPanel } from "@/components/attempt/AttemptDetailPanel";

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const attempt = await getAttempt(supabase, attemptId);

  if (!attempt) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Link
        href={`/coffees/${attempt.coffee.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {attempt.coffee.roaster} · {attempt.coffee.name}
      </Link>

      <div className="mt-4">
        <AttemptDetailPanel
          attempt={attempt}
          coffeeId={attempt.coffee.id}
          isPreferred={attempt.coffee.preferred_attempt_id === attempt.id}
        />
      </div>
    </div>
  );
}
