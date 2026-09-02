import Link from "next/link";
import { Star } from "lucide-react";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  return locale === "en"
    ? date.toLocaleDateString("en-US", { day: "2-digit", month: "short" })
    : date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function Node({
  attempt,
  childrenByParent,
  preferredAttemptId,
  depth,
  dict,
  locale,
}: {
  attempt: BrewAttemptRow;
  childrenByParent: Map<string, BrewAttemptRow[]>;
  preferredAttemptId: string | null;
  depth: number;
  dict: Dictionary;
  locale: Locale;
}) {
  const children = childrenByParent.get(attempt.id) ?? [];

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div
        className={
          depth > 0 ? "border-l-2 border-border pl-4" : undefined
        }
      >
        <Link
          href={`/attempts/${attempt.id}`}
          className="flex items-center gap-2 py-2 text-sm text-ink"
        >
          <span className="font-medium">#{attempt.attempt_no}</span>
          <span className="text-ink-muted">{formatDate(attempt.created_at, locale)}</span>
          {attempt.overall_rating && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">
              {attempt.overall_rating}/5
            </span>
          )}
          {attempt.id === preferredAttemptId && (
            <Star aria-label={dict.attempts.preferred} className="size-3.5 fill-coffee text-coffee" />
          )}
        </Link>
        {children.map((child) => (
          <Node
            key={child.id}
            attempt={child}
            childrenByParent={childrenByParent}
            preferredAttemptId={preferredAttemptId}
            depth={depth + 1}
            dict={dict}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

export function EvolutionTree({
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
  if (!attempts.length) {
    return <p className="text-sm text-ink-muted">{dict.attempts.noAttemptsToEvolve}</p>;
  }

  const childrenByParent = new Map<string, BrewAttemptRow[]>();
  const roots: BrewAttemptRow[] = [];

  for (const attempt of attempts) {
    if (attempt.parent_attempt_id) {
      const list = childrenByParent.get(attempt.parent_attempt_id) ?? [];
      list.push(attempt);
      childrenByParent.set(attempt.parent_attempt_id, list);
    } else {
      roots.push(attempt);
    }
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.attempt_no - b.attempt_no);
  }
  roots.sort((a, b) => a.attempt_no - b.attempt_no);

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      {roots.map((root) => (
        <Node
          key={root.id}
          attempt={root}
          childrenByParent={childrenByParent}
          preferredAttemptId={preferredAttemptId}
          depth={0}
          dict={dict}
          locale={locale}
        />
      ))}
    </div>
  );
}
