import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { getCompareFields } from "@/features/attempts/compareFields";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";
import { formatDate } from "@/lib/i18n/format-date";

export function CompareView({
  attempts,
  preferredAttemptId,
  dict,
  locale,
}: {
  attempts: BrewAttemptRow[];
  preferredAttemptId: string | null;
  dict: Dictionary;
  locale: Locale;
}) {
  const compareFields = getCompareFields(dict);
  const valuesByField = new Map(
    compareFields.map((field) => [field.key, attempts.map((a) => field.format(a))]),
  );

  function differs(fieldKey: string) {
    const values = valuesByField.get(fieldKey) ?? [];
    return new Set(values).size > 1;
  }

  const technicalFields = compareFields.filter((f) => f.group === "technical");
  const sensoryFields = compareFields.filter((f) => f.group === "sensory");

  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      {attempts.map((attempt, index) => (
        <div
          key={attempt.id}
          className="w-[260px] shrink-0 snap-start rounded-card border border-border bg-surface p-4"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-display text-lg text-ink">#{attempt.attempt_no}</span>
            {attempt.id === preferredAttemptId && (
              <Star aria-label={dict.attempts.preferred} className="size-4 fill-coffee text-coffee" />
            )}
          </div>
          <p className="text-xs text-ink-muted">{formatDate(attempt.created_at, locale)}</p>

          <div className="mt-4 space-y-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {dict.attempts.technical}
            </p>
            {technicalFields.map((field) => (
              <div key={field.key} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-ink-muted">{field.label}</span>
                <span
                  className={cn(
                    "text-right text-ink",
                    differs(field.key) && "rounded-full bg-canvas px-2 py-0.5 font-medium",
                  )}
                >
                  {valuesByField.get(field.key)?.[index]}
                </span>
              </div>
            ))}

            <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {dict.attempts.tasting}
            </p>
            {sensoryFields.map((field) => (
              <div key={field.key} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-ink-muted">{field.label}</span>
                <span
                  className={cn(
                    "text-right text-ink",
                    differs(field.key) && "rounded-full bg-canvas px-2 py-0.5 font-medium",
                  )}
                >
                  {valuesByField.get(field.key)?.[index]}
                </span>
              </div>
            ))}
          </div>

          {attempt.notes && (
            <p className="mt-3 border-t border-border pt-2 text-xs text-ink-muted">
              {attempt.notes}
            </p>
          )}

          <Link
            href={`/attempts/new?coffeeBagId=${attempt.coffee_bag_id}&duplicateFrom=${attempt.id}`}
            className="mt-4 block min-h-11 rounded-input border border-border px-3 text-center text-sm font-medium leading-[2.75rem] text-ink"
          >
            {dict.attempts.useAsBase}
          </Link>
        </div>
      ))}
    </div>
  );
}
