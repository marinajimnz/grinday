import Link from "next/link";
import { cn } from "@/lib/cn";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import { IconCafe, IconFavorita } from "@/components/icons/pencil-icons";
import type { RecentAttempt } from "@/features/dashboard/queries";
import type { BrewMethod } from "@/features/equipment/constants";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";
import { formatRelativeDay } from "@/lib/i18n/format-date";

function formatDuration(extractionMs: number | null) {
  if (extractionMs == null) return null;
  const totalSeconds = Math.round(extractionMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSummary(attempt: RecentAttempt, noRecipeData: string) {
  const parts: string[] = [];
  if (attempt.dose_g != null) {
    const weight = attempt.output_weight_g ?? attempt.target_weight_g ?? attempt.water_g;
    if (weight != null && weight > 0) {
      parts.push(`${attempt.dose_g} g → ${weight} g · 1:${(weight / attempt.dose_g).toFixed(1)}`);
    } else {
      parts.push(`${attempt.dose_g} g`);
    }
  }
  if (attempt.coffee?.name) parts.push(attempt.coffee.name);
  return parts.length ? parts.join(" · ") : noRecipeData;
}

function StarRow({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <div className="flex justify-end gap-0.5 text-coffee">
      {[1, 2, 3, 4, 5].map((n) => (
        <IconFavorita key={n} aria-hidden className={cn("size-3", n > rating && "fill-none")} />
      ))}
    </div>
  );
}

export async function RecentAttemptsList({ attempts }: { attempts: RecentAttempt[] }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  if (!attempts.length) {
    return <p className="text-sm text-ink-muted">{dict.dashboard.noBrewsYet}</p>;
  }

  return (
    <ul className="space-y-3">
      {attempts.map((attempt) => {
        const method = (attempt.method as BrewMethod) ?? "espresso";
        const Icon = METHOD_ICONS[method] ?? IconCafe;
        const duration = formatDuration(attempt.extraction_ms);

        return (
          <li key={attempt.id}>
            <Link
              href={`/attempts/${attempt.id}`}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-canvas text-ink">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-ink">
                    {dict.equipment.methodLabels[method] ?? attempt.method}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {formatRelativeDay(attempt.created_at, locale, {
                      today: dict.dashboard.today,
                      yesterday: dict.dashboard.yesterday,
                    })}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-muted">
                  {formatSummary(attempt, dict.dashboard.noRecipeData)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <StarRow rating={attempt.overall_rating} />
                {duration && <p className="mt-0.5 text-xs text-ink-muted">{duration}</p>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
