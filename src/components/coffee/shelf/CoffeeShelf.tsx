"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { IconChevronIzq, IconPreparar } from "@/components/icons/pencil-icons";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { hasBrewableBag } from "@/features/coffees/brewable";
import { indexAfterSwipe } from "@/features/coffees/shelf";
import type { CoffeeListItem } from "@/features/coffees/queries";
import { ShelfBag } from "./ShelfBag";

// Bags sit this far apart on the shelf, centre to centre.
const STEP = 168;
// Below this a pointer that moved is still a tap or a hold, not a drag.
const DRAG_START_PX = 8;
// A tap that ends a swipe arrives as a click; anything inside this window
// after a swipe is the swipe's own release, not the user picking a bag.
const CLICK_AFTER_SWIPE_MS = 350;

// The library as a shelf: one bag per coffee, slid sideways with a finger
// (or the arrows), the one in front scaled up so its label is readable.
// Holding the front bag turns it around to show the back.
export function CoffeeShelf({ coffees }: { coffees: CoffeeListItem[] }) {
  const dict = useDictionary();
  const t = dict.coffees.shelf;
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const swipedAtRef = useRef(0);

  const length = coffees.length;
  const current = Math.min(index, length - 1);
  const coffee = coffees[current];

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(length - 1, next)));
    setFlipped(false);
  }

  // The drag is followed on the window, not the shelf, so a finger that
  // slides off the bags (or a mouse that leaves the page) still lets go.
  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const moved = e.clientX - drag.x;
      if (!drag.active) {
        // Mostly-vertical movement is the page scrolling, not a swipe.
        if (Math.abs(moved) < DRAG_START_PX || Math.abs(moved) < Math.abs(e.clientY - drag.y)) return;
        drag.active = true;
        setDragging(true);
        setFlipped(false);
      }
      setDx(moved);
    }
    function handleUp(e: PointerEvent) {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag?.active) return;
      swipedAtRef.current = Date.now();
      const moved = e.type === "pointercancel" ? 0 : e.clientX - drag.x;
      setIndex((i) => indexAfterSwipe(Math.min(i, length - 1), moved, STEP, length));
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

  if (!coffee) return null;
  const brewable = hasBrewableBag(coffee);

  return (
    <section aria-label={t.label}>
      <div
        className="relative -mx-4 h-[446px] touch-pan-y select-none overflow-hidden md:mx-0"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          dragRef.current = { x: e.clientX, y: e.clientY, active: false };
        }}
      >
        {coffees.map((c, i) => (
          <ShelfBag
            key={c.id}
            coffee={c}
            offset={i - current}
            dx={dx}
            dragging={dragging}
            flipped={flipped}
            onCenter={() => goTo(i)}
            onToggleFlip={() => setFlipped((f) => !f)}
            shouldIgnoreClick={() => Date.now() - swipedAtRef.current < CLICK_AFTER_SWIPE_MS}
          />
        ))}

        <svg
          viewBox="0 0 390 80"
          preserveAspectRatio="none"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute inset-x-0 top-[358px] h-20 w-full text-ink"
          aria-hidden
        >
          <g filter="url(#pencil-c)">
            <path d="M-6 12 L10 2 H380 L396 12 Z" fill="var(--shelf-top)" />
            <path d="M-6 12 H396 V34 H-6 Z" fill="var(--shelf-front)" />
            <path d="M60 34 V64 M60 34 H86 M60 58 L84 36" />
            <path d="M330 34 V64 M330 34 H304 M330 58 L306 36" />
          </g>
          <g className="text-coffee" stroke="currentColor" strokeWidth={1.2} opacity={0.6} filter="url(#pencil-a)">
            <path d="M20 20 C70 17 120 24 170 20" />
            <path d="M210 26 C250 23 300 29 360 25" />
            <path d="M120 28 c6 -3 12 -3 18 0" />
          </g>
        </svg>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          className="w-11 px-0"
          aria-label={t.previous}
          disabled={current === 0}
          onClick={() => goTo(current - 1)}
        >
          <IconChevronIzq aria-hidden className="size-4" />
        </Button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {coffees.map((c, i) => (
            <span
              key={c.id}
              className={cn(
                "block h-1.5 rounded-full transition-all duration-300",
                i === current ? "w-[18px] bg-ink" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
        <Button
          variant="secondary"
          className="w-11 px-0"
          aria-label={t.next}
          disabled={current === length - 1}
          onClick={() => goTo(current + 1)}
        >
          <IconChevronIzq aria-hidden className="size-4 -scale-x-100" />
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {`${coffee.name}, ${t.position.replace("{n}", String(current + 1)).replace("{total}", String(length))}`}
      </p>

      <p className="mt-1.5 text-center text-[11px] text-ink-muted">{flipped ? t.backHint : t.holdHint}</p>

      <div className="mt-2">
        {brewable ? (
          <Button href={`/brew/new?coffee=${coffee.id}`} fullWidth className="font-display text-base tracking-wide">
            <IconPreparar aria-hidden className="size-[18px]" />
            {t.prepareThis}
          </Button>
        ) : (
          <Button fullWidth disabled className="font-display text-base tracking-wide">
            {t.nothingToBrew}
          </Button>
        )}
      </div>
    </section>
  );
}
