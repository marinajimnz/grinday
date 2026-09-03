"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Same collapsed-row / expanded-panel pattern as BagAccordionItem, applied
// to a single settings action so several of them can sit on screen at once
// instead of one long always-open form each.
export function SettingsAccordionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-card border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-sm font-medium text-ink">{title}</span>
        {expanded ? (
          <ChevronUp aria-hidden className="size-4 shrink-0 text-ink-muted" />
        ) : (
          <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-muted" />
        )}
      </button>
      {expanded && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
