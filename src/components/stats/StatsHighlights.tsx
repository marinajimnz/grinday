import Link from "next/link";
import type { PeriodHighlights } from "@/features/stats/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

type Highlight = { label: string; value: string | null; href?: string };

function HighlightCard({ label, value, href, empty }: Highlight & { empty: string }) {
  const body = (
    <>
      <p className="text-xs text-ink-muted">{label}</p>
      {/* Two lines, not one truncated one: "Finca El Paraíso Geisha"
          cut at the card's edge names no coffee at all. The cards in a
          row stretch to the tallest, so a wrapped name doesn't leave
          its neighbour short. */}
      <p className="mt-0.5 line-clamp-2 font-display text-base leading-tight text-ink">
        {value ?? empty}
      </p>
    </>
  );

  // A card that names a coffee goes to that coffee; the method and roast
  // ones name a category the app has no page for, so they stay inert
  // rather than becoming a link to a search that doesn't exist.
  return href ? (
    <Link href={href} className="block h-full min-w-0 rounded-card border border-border bg-surface p-4">
      {body}
    </Link>
  ) : (
    <div className="h-full min-w-0 rounded-card border border-border bg-surface p-4">{body}</div>
  );
}

export function StatsHighlights({
  highlights,
  dict,
}: {
  highlights: PeriodHighlights | null;
  dict: Dictionary;
}) {
  const methodKey = highlights?.top_method as keyof typeof dict.equipment.methodLabels | undefined;
  const roastKey = highlights?.top_roast as keyof typeof dict.enums.roastLevel | undefined;

  const cards: Highlight[] = [
    {
      label: dict.stats.favouriteMethod,
      value: methodKey ? (dict.equipment.methodLabels[methodKey] ?? methodKey) : null,
    },
    {
      label: dict.stats.favouriteRoast,
      value: roastKey ? (dict.enums.roastLevel[roastKey] ?? roastKey) : null,
    },
    {
      label: dict.stats.bestRated,
      value: highlights?.best_coffee_name ?? null,
      href: highlights?.best_coffee_id ? `/coffees/${highlights.best_coffee_id}` : undefined,
    },
    {
      label: dict.stats.mostRepeated,
      value: highlights?.top_coffee_name ?? null,
      href: highlights?.top_coffee_id ? `/coffees/${highlights.top_coffee_id}` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <HighlightCard key={card.label} {...card} empty={dict.stats.noneYet} />
      ))}
    </div>
  );
}
