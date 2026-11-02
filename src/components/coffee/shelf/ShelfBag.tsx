"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useLongPress } from "@/components/ui/useLongPress";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatDate } from "@/lib/i18n/format-date";
import { type BAG_STATUSES, type PROCESS_OPTIONS, type ROAST_LEVELS } from "@/features/coffees/constants";
import { activeBag, bagTintFor, roastBeans } from "@/features/coffees/shelf";
import type { CoffeeListItem } from "@/features/coffees/queries";

// The bag is drawn on a 170×266 grid, and the label's text is sized to
// that grid too: the centred bag is scaled up as a whole, text included,
// rather than reflowed.
export const BAG_WIDTH = 170;
export const BAG_HEIGHT = 266;

const STATUS_CLASSES: Record<(typeof BAG_STATUSES)[number], string> = {
  sealed: "bg-border/50 text-ink-muted",
  open: "bg-coffee/15 text-coffee",
  finished: "bg-border text-ink-muted",
  archived: "bg-border/60 text-ink-muted",
};

const BAG_BODY = "M16 34 C12 116 10 192 14 254 H156 C160 192 158 116 154 34 Z";
const BAG_SEAL = "M14 12 H156 V34 H14 Z";
const BAG_GUSSET = "M14 254 C50 242 120 242 156 254";
const SQUIGGLE = "M1 3 C12 0 20 6 32 3 S54 0 66 3 S90 6 103 2";
const BEAN_OUTLINE =
  "M12 3.6 c4.6 0 8.4 3.8 8.4 8.4 0 4.6 -3.8 8.4 -8.4 8.4 -4.6 0 -8.4 -3.8 -8.4 -8.4 0 -4.6 3.8 -8.4 8.4 -8.4 Z";
const BEAN_CREASE = "M8.2 19 C11 16 11.4 12.7 9.4 10.1 7.4 7.5 8.6 5.4 11.4 3.8";

export function ShelfBag({
  coffee,
  offset,
  dx,
  dragging,
  flipped,
  onCenter,
  onToggleFlip,
  shouldIgnoreClick,
}: {
  coffee: CoffeeListItem;
  /** Places from the centre of the shelf: 0 is the bag in front. */
  offset: number;
  /** How far the shelf is being dragged right now, in px. */
  dx: number;
  dragging: boolean;
  flipped: boolean;
  onCenter: () => void;
  onToggleFlip: () => void;
  /** True right after a swipe, whose release would otherwise land as a tap. */
  shouldIgnoreClick: () => boolean;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.coffees.shelf;
  const centered = offset === 0;
  const distance = Math.abs(offset);
  const showBack = centered && flipped;
  const tint = `var(--bag-tint-${bagTintFor(coffee.id)})`;

  const longPress = useLongPress(() => {
    if (centered) onToggleFlip();
  });

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    longPress.onClick(e);
    if (e.defaultPrevented) return;
    if (shouldIgnoreClick()) {
      e.preventDefault();
      return;
    }
    // Only the bag in front opens the coffee. Tapping one beside it brings
    // it to the front instead, and tapping a turned bag turns it back.
    if (!centered) {
      e.preventDefault();
      onCenter();
    } else if (flipped) {
      e.preventDefault();
      onToggleFlip();
    }
  }

  const bag = activeBag(coffee.bags);
  const status = bag?.status as (typeof BAG_STATUSES)[number] | undefined;
  const roastLabel = coffee.roast_level
    ? (dict.enums.roastLevel[coffee.roast_level as (typeof ROAST_LEVELS)[number]] ?? coffee.roast_level)
    : null;
  const beans = roastBeans(coffee.roast_level);
  const process = coffee.process
    ? (dict.enums.process[coffee.process as (typeof PROCESS_OPTIONS)[number]] ?? coffee.process)
    : null;
  const bagCount = `${coffee.bags.length} ${coffee.bags.length === 1 ? dict.coffees.bag : dict.coffees.bags}`;

  const facts = [
    { label: dict.coffees.region, value: coffee.region },
    { label: dict.coffees.farm, value: coffee.farm },
    { label: dict.coffees.producer, value: coffee.producer },
    {
      label: dict.coffees.altitude,
      value:
        coffee.altitude_min_m || coffee.altitude_max_m
          ? `${coffee.altitude_min_m ?? "?"}–${coffee.altitude_max_m ?? "?"} m`
          : null,
    },
    { label: dict.coffees.varieties, value: coffee.varieties.join(", ") || null },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const lift = centered && !dragging ? -18 : 0;
  const scale = centered ? 1.3 : 0.8;

  return (
    <Link
      href={`/coffees/${coffee.id}`}
      {...longPress}
      onClick={handleClick}
      onFocus={() => {
        if (!centered) onCenter();
      }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      data-shelf-bag={coffee.id}
      className="absolute left-[calc(50%-85px)] top-[104px] select-none text-ink outline-none [perspective:900px] focus-visible:[&>div]:outline-2 focus-visible:[&>div]:outline-offset-4 focus-visible:[&>div]:outline-ink"
      style={{
        width: BAG_WIDTH,
        height: BAG_HEIGHT,
        transformOrigin: "50% 100%",
        transform: `translate(${offset * 168 + dx}px, ${lift}px) scale(${scale})`,
        transition: dragging ? "none" : "transform 0.5s cubic-bezier(.22,1,.36,1), opacity 0.3s",
        opacity: distance > 2 ? 0 : 1,
        zIndex: 10 - distance,
      }}
    >
      <div
        className="absolute inset-0 rounded-[6px] [transform-style:preserve-3d]"
        style={{
          transition: "transform 0.6s cubic-bezier(.22,1,.36,1)",
          transform: `rotateY(${showBack ? 180 : 0}deg)`,
        }}
      >
        {/* Front: the label with what the library cards used to show as
            chips. Its details fade in only on the bag in front. */}
        <div className="absolute inset-0 [backface-visibility:hidden]" aria-hidden={showBack} inert={showBack}>
          <svg
            viewBox={`0 0 ${BAG_WIDTH} ${BAG_HEIGHT}`}
            width={BAG_WIDTH}
            height={BAG_HEIGHT}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute inset-0 overflow-visible"
            aria-hidden
          >
            <g filter="url(#pencil-b)">
              <path d={BAG_BODY} fill={tint} />
              <path d={BAG_SEAL} fill={tint} />
              <path d={BAG_GUSSET} />
              <path d="M14 19 L20 22 L14 25" />
              <path d="M85 52 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0" />
              <path d="M85 52 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0" />
            </g>
            <path d="M20 42 H150" strokeDasharray="5 5" strokeWidth={1.4} filter="url(#pencil-a)" />
            <path className="bag-label" d="M24 70 H146 V234 H24 Z" fill="var(--bag-label)" strokeWidth={1.8} filter="url(#pencil-c)" />
          </svg>

          <div className="bag-label absolute left-[24px] top-[70px] flex h-[164px] w-[122px] flex-col px-[9px] pb-[8px] pt-[9px]">
            <span className="truncate text-[7.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {coffee.roaster}
            </span>
            <span className="mt-[3px] line-clamp-2 font-display text-[15px] leading-[1.05]">{coffee.name}</span>
            <svg viewBox="0 0 104 6" width={104} height={6} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" filter="url(#pencil-a)" className="mt-[5px] text-coffee" aria-hidden>
              <path d={SQUIGGLE} />
            </svg>

            <div
              className="mt-[6px] flex flex-col gap-[4px] transition-opacity duration-300"
              style={{ opacity: centered && !dragging ? 1 : 0 }}
            >
              {coffee.country && (
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[7px] text-ink-muted">{t.origin}</span>
                  <span className="truncate text-[8.5px] font-semibold">{coffee.country}</span>
                </div>
              )}
              {process && (
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[7px] text-ink-muted">{dict.coffees.process}</span>
                  <span className="truncate text-[8.5px] font-semibold">{process}</span>
                </div>
              )}
              {roastLabel && (
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[7px] text-ink-muted">
                    {t.roast} · {roastLabel}
                  </span>
                  {beans !== null && (
                    <span className="flex gap-px text-coffee" aria-hidden>
                      {[1, 2, 3].map((n) => (
                        <svg key={n} viewBox="0 0 24 24" width={10} height={10} fill={n <= beans ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" filter="url(#pencil-b)">
                          <path d={BEAN_OUTLINE} />
                          <path d={BEAN_CREASE} stroke={n <= beans ? "var(--bag-label)" : "currentColor"} />
                        </svg>
                      ))}
                    </span>
                  )}
                </div>
              )}
              {coffee.tasting_notes.length > 0 && (
                <div className="flex flex-col gap-px">
                  <span className="text-[7px] text-ink-muted">{t.notes}</span>
                  <span className="line-clamp-2 text-[8.5px] font-semibold italic text-coffee">
                    {coffee.tasting_notes.join(" · ")}
                  </span>
                </div>
              )}
              <div className="mt-[2px] flex items-center justify-between">
                {status ? (
                  <span className={cn("rounded-full px-[6px] py-[2px] text-[7.5px] font-semibold", STATUS_CLASSES[status] ?? STATUS_CLASSES.sealed)}>
                    {dict.enums.bagStatus[status] ?? status}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-[7.5px] text-ink-muted">{bagCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back: the rest of the coffee's sheet and each of its bags, the
            way the back of a real bag carries the small print. */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={!showBack}
          inert={!showBack}
        >
          <svg
            viewBox={`0 0 ${BAG_WIDTH} ${BAG_HEIGHT}`}
            width={BAG_WIDTH}
            height={BAG_HEIGHT}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute inset-0 overflow-visible"
            aria-hidden
          >
            <g filter="url(#pencil-b)">
              <path d={BAG_BODY} fill={tint} />
              <path d={BAG_SEAL} fill={tint} />
              <path d={BAG_GUSSET} />
              <path d="M156 19 L150 22 L156 25" />
            </g>
            <path d="M20 42 H150" strokeDasharray="5 5" strokeWidth={1.4} filter="url(#pencil-a)" />
            <path className="bag-label" d="M20 50 H150 V238 H20 Z" fill="var(--bag-label)" strokeWidth={1.8} filter="url(#pencil-c)" />
          </svg>

          <div className="bag-label absolute left-[20px] top-[50px] flex h-[188px] w-[130px] flex-col px-[9px] pb-[7px] pt-[9px]">
            <span className="line-clamp-2 font-display text-[11px] leading-[1.05]">{coffee.name}</span>
            <svg viewBox="0 0 104 6" width={104} height={6} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" filter="url(#pencil-a)" className="mt-[4px] text-coffee" aria-hidden>
              <path d={SQUIGGLE} />
            </svg>
            {facts.length ? (
              <dl className="mt-[5px] flex flex-col gap-[4px]">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-baseline gap-[3px]">
                    <dt className="whitespace-nowrap text-[6.5px] text-ink-muted">{f.label}</dt>
                    <span aria-hidden className="flex-1 border-b border-dotted border-border" />
                    <dd className="truncate text-right text-[8px] font-semibold">{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-[5px] text-[7.5px] text-ink-muted">{t.noMoreFacts}</p>
            )}
            <div className="mt-auto flex flex-col gap-[2px]">
              <span className="text-[6.5px] text-ink-muted">{t.yourBags}</span>
              {coffee.bags.slice(0, 4).map((b) => {
                const s = b.status as (typeof BAG_STATUSES)[number];
                return (
                  <div key={b.id} className="flex items-center justify-between gap-1 text-[7px]">
                    <span className="truncate">
                      {b.roast_date ? t.roasted.replace("{date}", formatDate(b.roast_date, locale)) : t.noRoastDate}
                    </span>
                    <span className={cn("shrink-0 font-semibold", s === "open" ? "text-coffee" : "text-ink-muted")}>
                      {dict.enums.bagStatus[s] ?? b.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
