"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button, buttonClassName } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { BrewSummary } from "@/components/attempt/BrewSummary";
import { PrepareWithRecipeButton } from "@/components/brew/PrepareWithRecipeButton";
import { IconCafe, IconChevronIzq, IconFavorita } from "@/components/icons/pencil-icons";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import { startBrewFromAttempt } from "@/features/brew/startFromAttempt";
import { stackIndexAfter, type RecipeStackKind } from "@/features/dashboard/recipeStack";
import type { RecentAttempt } from "@/features/dashboard/queries";
import type { RecipeSourceAttempt } from "@/features/brew/draft";
import type { BrewMethod } from "@/features/equipment/constants";

export type RecipeStackCard = {
  kind: RecipeStackKind;
  attempt: RecentAttempt;
  /** Only on the pinned recipe: what "Preparar receta" seeds the brew with
   *  without a trip to the server, the way the old recipe card did. */
  recipe?: {
    coffeeId: string;
    coffeeBagId: string;
    coffeeName: string;
    roaster: string;
    sourceAttempt: RecipeSourceAttempt;
  };
};

// A drag past this many pixels throws the top card to the back.
const THROW_PX = 90;
const DRAG_START_PX = 8;
// Cards behind the top one that still show. Any more and the pile would
// grow down into the arrows underneath it.
const VISIBLE_BEHIND = 2;

// The top of Inicio: the recipes you'd want to brew again as a pile of
// cards — the coffee's pinned recipe, the last attempt, the best of the
// week — and, when there are more favourites than the pile shows, a last
// card that opens them all. Swipe the top card (or use the arrows) to bring
// the next one forward.
export function RecipeStack({
  cards,
  favouriteCount,
  userId,
}: {
  cards: RecipeStackCard[];
  /** How many favourites to offer on the closing card; null leaves it out. */
  favouriteCount: number | null;
  userId: string;
}) {
  const dict = useDictionary();
  const t = dict.dashboard;
  const [top, setTop] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const hasEnd = favouriteCount !== null;
  const length = cards.length + (hasEnd ? 1 : 0);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const moved = e.clientX - drag.x;
      if (!drag.active) {
        if (Math.abs(moved) < DRAG_START_PX || Math.abs(moved) < Math.abs(e.clientY - drag.y)) return;
        drag.active = true;
        setDragging(true);
      }
      setDx(moved);
    }
    function handleUp(e: PointerEvent) {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag?.active) return;
      const moved = e.type === "pointercancel" ? 0 : e.clientX - drag.x;
      if (Math.abs(moved) > THROW_PX) setTop((i) => stackIndexAfter(i, 1, length));
      setDx(0);
      setDragging(false);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [length]);

  if (!length) return null;

  function style(index: number): React.CSSProperties {
    const depth = stackIndexAfter(index, -top, length);
    const transform =
      depth === 0
        ? `translateX(${dx}px) rotate(${dx / 18}deg)`
        : `translateY(${Math.min(depth, VISIBLE_BEHIND) * 10}px) rotate(${depth % 2 ? 3 : -3}deg) scale(${1 - Math.min(depth, VISIBLE_BEHIND) * 0.04})`;
    return {
      transform,
      transition: depth === 0 && dragging ? "none" : "transform 0.45s cubic-bezier(.22,1,.36,1), opacity 0.3s",
      zIndex: 10 - depth,
      opacity: depth > VISIBLE_BEHIND ? 0 : 1,
    };
  }

  const position = (n: number) =>
    t.stackPosition.replace("{n}", String(n + 1)).replace("{total}", String(cards.length));

  return (
    <section aria-label={t.stackLabel}>
      <div
        className="relative h-[410px] touch-pan-y select-none"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if ((e.target as HTMLElement).closest("a, button")) return;
          dragRef.current = { x: e.clientX, y: e.clientY, active: false };
        }}
      >
        {cards.map((card, i) => {
          const isTop = stackIndexAfter(i, -top, length) === 0;
          return (
            <StackFrame key={card.attempt.id} style={style(i)} isTop={isTop}>
              <RecipeCardFace card={card} position={position(i)} userId={userId} />
            </StackFrame>
          );
        })}
        {hasEnd && (
          <StackFrame style={style(cards.length)} isTop={top === cards.length} dashed>
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <IconFavorita aria-hidden className="size-12 text-coffee" />
              <p className="mt-4 font-display text-[22px] leading-tight text-ink">
                {favouriteCount === 1
                  ? t.favouritesCountOne
                  : t.favouritesCount.replace("{count}", String(favouriteCount))}
              </p>
              <p className="mt-1.5 text-sm text-ink-muted">{t.favouritesGrouped}</p>
              <Button href="/recipes" fullWidth className="mt-6 min-h-12 font-display text-base tracking-wide">
                {t.seeAll}
              </Button>
              <button
                type="button"
                onClick={() => setTop(0)}
                className="mt-2 min-h-11 px-3 text-sm font-medium text-ink-muted underline"
              >
                {t.backToFirst}
              </button>
            </div>
          </StackFrame>
        )}
      </div>

      {length > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            className="w-11 bg-surface px-0"
            aria-label={t.stackPrevious}
            onClick={() => setTop((i) => stackIndexAfter(i, -1, length))}
          >
            <IconChevronIzq aria-hidden className="size-4" />
          </Button>
          <span className="text-xs text-ink-muted">{t.stackHint}</span>
          <Button
            variant="secondary"
            className="w-11 bg-surface px-0"
            aria-label={t.stackNext}
            onClick={() => setTop((i) => stackIndexAfter(i, 1, length))}
          >
            <IconChevronIzq aria-hidden className="size-4 -scale-x-100" />
          </Button>
        </div>
      )}
    </section>
  );
}

// One card of the pile: the hand-drawn paper and its position. Only the
// card on top can be read or tapped; the ones behind are scenery.
function StackFrame({
  style,
  isTop,
  dashed = false,
  children,
}: {
  style: React.CSSProperties;
  isTop: boolean;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-x-0 top-4 mx-auto h-[348px] w-full max-w-[326px] origin-[50%_90%]"
      style={style}
      aria-hidden={!isTop}
      inert={!isTop}
    >
      <svg
        viewBox="0 0 326 348"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible text-ink"
        aria-hidden
      >
        <path
          d="M3 3 H323 V345 H3 Z"
          fill="var(--color-surface)"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray={dashed ? "7 6" : undefined}
          strokeLinejoin="round"
          filter="url(#pencil-c)"
        />
        {!dashed && (
          <path d="M3 46 H323" stroke="var(--color-coffee)" strokeWidth={1.2} opacity={0.5} filter="url(#pencil-c)" />
        )}
      </svg>
      {/* Behind the top card only the paper shows: its contents would peek
          out under the edge as half a button. */}
      <div className={cn("relative h-full transition-opacity duration-300", isTop ? "opacity-100" : "opacity-0")}>
        {children}
      </div>
    </div>
  );
}

function RecipeCardFace({
  card,
  position,
  userId,
}: {
  card: RecipeStackCard;
  position: string;
  userId: string;
}) {
  const dict = useDictionary();
  const t = dict.dashboard;
  const { attempt, recipe } = card;
  const method = (attempt.method as BrewMethod) ?? "espresso";
  const Icon = METHOD_ICONS[method] ?? IconCafe;
  const label = card.kind === "preferred" ? t.preferredRecipe : card.kind === "last" ? t.lastAttempt : t.bestOfWeek;

  return (
    <div className="flex h-full flex-col px-5 pb-5 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-coffee">{label}</span>
        <span className="text-[11px] text-ink-muted">{position}</span>
      </div>

      <div className="mt-8 flex items-center gap-3.5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-canvas text-ink">
          <Icon aria-hidden className="size-8" />
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 font-display text-[22px] leading-[1.05] text-ink">
            {attempt.coffee?.name}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-muted">
            {attempt.coffee?.roaster} · {dict.equipment.methodLabels[method] ?? attempt.method}
          </span>
        </span>
      </div>

      <BrewSummary attempt={attempt} dict={dict} size="lg" className="mt-5" />

      <StarRating value={attempt.overall_rating} className="mx-auto mt-3" />

      <div className="mt-auto flex gap-2 pt-4">
        <Button href={`/attempts/${attempt.id}`} variant="secondary" className="min-h-12 bg-surface">
          {t.viewAttempt} #{attempt.attempt_no}
        </Button>
        {recipe ? (
          <PrepareWithRecipeButton
            coffeeId={recipe.coffeeId}
            coffeeBagId={recipe.coffeeBagId}
            coffeeName={recipe.coffeeName}
            roaster={recipe.roaster}
            userId={userId}
            sourceAttempt={recipe.sourceAttempt}
            className="min-h-12 flex-1 whitespace-nowrap"
          >
            {t.prepareWithRecipe}
          </PrepareWithRecipeButton>
        ) : (
          <RepeatButton attemptId={attempt.id} method={method} />
        )}
      </div>
    </div>
  );
}

function RepeatButton({ attemptId, method }: { attemptId: string; method: BrewMethod }) {
  const dict = useDictionary();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startBrewFromAttempt(attemptId, method);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            router.push(`/brew/live/${result.draftId}`);
          });
        }}
        className={cn(buttonClassName("primary"), "min-h-12 w-full whitespace-nowrap")}
      >
        <LoadingLabel loading={isPending}>{dict.dashboard.repeat}</LoadingLabel>
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
