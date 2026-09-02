"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAX_COMPARE_ATTEMPTS, MIN_COMPARE_ATTEMPTS } from "@/features/attempts/constants";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatDate } from "@/lib/i18n/format-date";

export function AttemptsTimeline({
  attempts,
  preferredAttemptId,
}: {
  attempts: BrewAttemptRow[];
  preferredAttemptId: string | null;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]);

  const attemptNoById = useMemo(
    () => new Map(attempts.map((a) => [a.id, a.attempt_no])),
    [attempts],
  );

  function toggleSelected(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE_ATTEMPTS) return prev;
      return [...prev, id];
    });
  }

  if (!attempts.length) {
    return <p className="text-sm text-ink-muted">{dict.attempts.noAttemptsYet}</p>;
  }

  return (
    <div className="pb-20">
      <ul className="space-y-3">
        {attempts.map((attempt) => {
          const isPreferred = attempt.id === preferredAttemptId;
          const isSelected = selected.includes(attempt.id);
          const parentNo = attempt.parent_attempt_id
            ? attemptNoById.get(attempt.parent_attempt_id)
            : undefined;

          return (
            <li
              key={attempt.id}
              className={cn(
                "flex items-center gap-3 rounded-card border bg-surface p-4",
                isPreferred ? "border-coffee" : "border-border",
              )}
            >
              <label className="flex items-center">
                <span className="sr-only">
                  {dict.attempts.selectAttemptToCompare} #{attempt.attempt_no}{" "}
                  {dict.attempts.selectAttemptToCompareSuffix}
                </span>
                <input
                  type="checkbox"
                  className="size-5"
                  checked={isSelected}
                  onChange={() => toggleSelected(attempt.id)}
                />
              </label>

              <Link href={`/attempts/${attempt.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base text-ink">
                    {dict.attempts.attemptNo} #{attempt.attempt_no}
                  </span>
                  {isPreferred && (
                    <Star aria-label={dict.attempts.preferred} className="size-4 fill-coffee text-coffee" />
                  )}
                  {attempt.overall_rating && (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">
                      {attempt.overall_rating}/5
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {formatDate(attempt.created_at, locale)}
                  {parentNo ? ` ${dict.attempts.derivesFrom} #${parentNo}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {selected.length >= MIN_COMPARE_ATTEMPTS && (
        <div className="fixed inset-x-0 bottom-16 z-10 flex justify-center px-4 md:bottom-4">
          <button
            type="button"
            onClick={() => router.push(`/compare?ids=${selected.join(",")}`)}
            className="min-h-11 rounded-full bg-ink px-6 text-sm font-medium text-surface shadow-soft"
          >
            {dict.attempts.compare} ({selected.length})
          </button>
        </div>
      )}
    </div>
  );
}
