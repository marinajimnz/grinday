"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// A profile section that shows its first `visible` items and, when there
// are more, a "see more" on the title's line that unfolds the rest in
// place. The items arrive already rendered (they're Server Components);
// this only decides how many to show.
export function ExpandableSection({
  title,
  items,
  visible = 4,
  listClassName,
}: {
  title: string;
  items: React.ReactNode[];
  visible?: number;
  listClassName?: string;
}) {
  const t = useDictionary().publicProfile;
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const hasMore = items.length > visible;
  const shown = expanded ? items : items.slice(0, visible);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {hasMore && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
            className="-mr-3 inline-flex min-h-11 items-center px-3 text-sm font-medium text-ink-muted underline"
          >
            {expanded ? t.seeLess : t.seeMore}
          </button>
        )}
      </div>
      <ul id={listId} className={cn("mt-3", listClassName)}>
        {shown}
      </ul>
    </section>
  );
}
