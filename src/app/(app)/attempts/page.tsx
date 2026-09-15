import { createClient } from "@/lib/supabase/server";
import { getRecentAttempts } from "@/features/dashboard/queries";
import { RecentAttemptsList } from "@/components/dashboard/RecentAttemptsList";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AttemptsPage() {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());
  const attempts = await getRecentAttempts(supabase, 50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-4xl text-ink">{dict.dashboard.recentBrews}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.dashboard.allBrewsSubtitle}</p>

      <div className="mt-8">
        <RecentAttemptsList attempts={attempts} />
      </div>
    </div>
  );
}
