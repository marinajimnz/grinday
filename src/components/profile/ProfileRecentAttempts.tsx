import { IconGrano } from "@/components/icons/pencil-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import type { BrewMethod } from "@/features/equipment/constants";
import type { PublicRecentAttempt } from "@/features/profile/publicQueries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";
import { formatRelativeDay } from "@/lib/i18n/format-date";

// Read-only "adaptation" of AttemptRow/AttemptsTimeline: same visual
// language (method icon, relative date, coffee name), no long-press menu
// and no link into the owner-only attempt detail page.
export function ProfileRecentAttempts({
  attempts,
  dict,
  locale,
}: {
  attempts: PublicRecentAttempt[];
  dict: Dictionary;
  locale: Locale;
}) {
  if (!attempts.length) {
    return (
      <EmptyState
        icon={IconGrano}
        title={dict.profile.noAttemptsTitle}
        description={dict.profile.noAttemptsDescription}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {attempts.map((attempt) => {
        const method = (attempt.method as BrewMethod) ?? "espresso";
        const Icon = METHOD_ICONS[method] ?? IconGrano;
        return (
          <li
            key={attempt.id}
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
              {attempt.coffee?.name && (
                <p className="mt-0.5 truncate text-sm text-ink-muted">{attempt.coffee.name}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
