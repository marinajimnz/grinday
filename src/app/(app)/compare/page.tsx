import Link from "next/link";
import { ChevronLeft, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAttemptsByIds } from "@/features/attempts/queries";
import { CompareView } from "@/components/attempt/CompareView";
import { EmptyState } from "@/components/ui/EmptyState";
import { MAX_COMPARE_ATTEMPTS, MIN_COMPARE_ATTEMPTS } from "@/features/attempts/constants";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const attempts =
    user && ids.length >= MIN_COMPARE_ATTEMPTS ? await getAttemptsByIds(supabase, ids, user.id) : [];
  const locale = await getLocale();
  const dict = getDictionary(locale);

  let preferredAttemptId: string | null = null;
  if (attempts.length && user) {
    const { data: coffee } = await supabase
      .from("coffees")
      .select("preferred_attempt_id")
      .eq("id", attempts[0].coffee_id)
      .eq("user_id", user.id)
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
          {dict.comparePage.backToCoffee}
        </Link>
      )}

      <h1 className="mt-2 font-display text-3xl text-ink">{dict.comparePage.title}</h1>

      <div className="mt-6">
        {attempts.length >= MIN_COMPARE_ATTEMPTS ? (
          <CompareView
            attempts={attempts}
            preferredAttemptId={preferredAttemptId}
            dict={dict}
            locale={locale}
          />
        ) : (
          <EmptyState
            icon={Scale}
            title={dict.comparePage.nothingToCompareTitle}
            description={dict.comparePage.nothingToCompareDescription}
          />
        )}
      </div>
    </div>
  );
}
