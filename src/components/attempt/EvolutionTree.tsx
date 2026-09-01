import Link from "next/link";
import { Star } from "lucide-react";
import type { BrewAttemptRow } from "@/features/attempts/queries";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function Node({
  attempt,
  childrenByParent,
  preferredAttemptId,
  depth,
}: {
  attempt: BrewAttemptRow;
  childrenByParent: Map<string, BrewAttemptRow[]>;
  preferredAttemptId: string | null;
  depth: number;
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
          <span className="text-ink-muted">{formatDate(attempt.created_at)}</span>
          {attempt.overall_rating && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">
              {attempt.overall_rating}/5
            </span>
          )}
          {attempt.id === preferredAttemptId && (
            <Star aria-label="Preferido" className="size-3.5 fill-coffee text-coffee" />
          )}
        </Link>
        {children.map((child) => (
          <Node
            key={child.id}
            attempt={child}
            childrenByParent={childrenByParent}
            preferredAttemptId={preferredAttemptId}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

export function EvolutionTree({
  attempts,
  preferredAttemptId,
}: {
  attempts: BrewAttemptRow[];
  preferredAttemptId: string | null;
}) {
  if (!attempts.length) {
    return <p className="text-sm text-ink-muted">Todavía no hay intentos que evolucionar.</p>;
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
        />
      ))}
    </div>
  );
}
