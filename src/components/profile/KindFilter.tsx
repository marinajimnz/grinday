import Link from "next/link";
import { cn } from "@/lib/cn";

// Todos / Personas / Tostadoras as links (?tipo=…), for a list the server
// renders — favourites. Search keeps its own client version, which also
// carries the query.
export function KindFilter({
  basePath,
  current,
  labels,
  ariaLabel,
}: {
  basePath: string;
  current: "" | "personas" | "tostadoras";
  labels: { all: string; people: string; roasters: string };
  ariaLabel: string;
}) {
  const options = [
    { value: "", label: labels.all },
    { value: "personas", label: labels.people },
    { value: "tostadoras", label: labels.roasters },
  ] as const;

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map(({ value, label }) => {
        const selected = current === value;
        return (
          <Link
            key={label}
            href={value ? `${basePath}?tipo=${value}` : basePath}
            replace
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium",
              selected ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
