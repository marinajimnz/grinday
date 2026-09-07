import type { RecentAttempt } from "@/features/dashboard/queries";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";
import { AttemptRow } from "./AttemptRow";

export async function RecentAttemptsList({ attempts }: { attempts: RecentAttempt[] }) {
  const dict = getDictionary(await getLocale());

  if (!attempts.length) {
    return <p className="text-sm text-ink-muted">{dict.dashboard.noBrewsYet}</p>;
  }

  return (
    <ul className="space-y-3">
      {attempts.map((attempt) => (
        <li key={attempt.id}>
          <AttemptRow attempt={attempt} />
        </li>
      ))}
    </ul>
  );
}
