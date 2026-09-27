"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { noZoomTextClassName } from "@/components/ui/Field";
import { BeanSpinner } from "@/components/ui/BeanSpinner";
import { useDictionary } from "@/components/i18n/LocaleProvider";

const KINDS = [
  { value: "", key: "kindAll" },
  { value: "personas", key: "kindPeople" },
  { value: "tostadoras", key: "kindRoasters" },
] as const;

const DEBOUNCE_MS = 250;

// The query and the kind live in the URL (?q=…&tipo=…), so the server page
// does the searching and a search can be shared or reloaded. Typing
// replaces the URL after a short pause rather than on every keystroke.
export function ProfileSearchBox({ initialQuery, kind }: { initialQuery: string; kind: string }) {
  const t = useDictionary().search;
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function navigate(nextQuery: string, nextKind: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextKind) params.set("tipo", nextKind);
    const search = params.toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  }

  return (
    <div className="space-y-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          navigate(query, kind);
        }}
      >
        <label htmlFor="profile-search" className="sr-only">
          {t.label}
        </label>
        <div className="flex min-h-11 items-center gap-2 rounded-input border border-border bg-surface px-3 focus-within:border-ink">
          <Search aria-hidden className="size-4 shrink-0 text-ink-muted" />
          <input
            id="profile-search"
            type="search"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t.placeholder}
            className={cn("min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted", noZoomTextClassName)}
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => navigate(next, kind), DEBOUNCE_MS);
            }}
          />
          {isPending && (
            <span role="status" className="inline-flex">
              <BeanSpinner className="size-4" />
              <span className="sr-only">{t.searching}</span>
            </span>
          )}
        </div>
      </form>

      <div role="group" aria-label={t.kindFilter} className="flex flex-wrap gap-2">
        {KINDS.map(({ value, key }) => {
          const selected = kind === value;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => navigate(query, value)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium",
                selected ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink",
              )}
            >
              {t[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
