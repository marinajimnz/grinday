"use client";

import { useEffect, useRef } from "react";

// Detecting the hold ourselves via pointer events (rather than the
// "contextmenu" DOM event) is what makes this work consistently on iOS
// Safari, which doesn't reliably fire contextmenu for a touch-and-hold on a
// plain link the way Android Chrome does.
const HOLD_DELAY_MS = 500;
const MOVE_CANCEL_PX = 10;

// Spread the returned handlers onto whatever element should react to a
// long press (typically a Link wrapping a list row): `{...useLongPress(fn)}`.
// A quick tap still fires its normal onClick/navigation; only a completed
// hold calls `onLongPress` and suppresses the trailing click.
export function useLongPress(onLongPress: () => void) {
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Kept in sync every render so the timeout below always calls the latest
  // callback instead of the stale one captured when the hold started.
  const latestOnLongPress = useRef(onLongPress);
  useEffect(() => {
    latestOnLongPress.current = onLongPress;
  });

  function clearHoldTimer() {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }
  useEffect(() => clearHoldTimer, []);

  function handlePointerDown(e: React.PointerEvent) {
    // Right mouse button already opens the menu instantly via
    // onContextMenu below — don't also start a hold timer for it.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    heldRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    clearHoldTimer();
    holdTimeoutRef.current = setTimeout(() => {
      heldRef.current = true;
      latestOnLongPress.current();
    }, HOLD_DELAY_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = startPosRef.current;
    if (!start) return;
    // Scrolling the list shouldn't be mistaken for a long press.
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) {
      clearHoldTimer();
    }
  }

  function handleClick(e: React.MouseEvent) {
    // The hold already fired — the click that follows on release would
    // otherwise also navigate/activate whatever's underneath it.
    if (heldRef.current) {
      e.preventDefault();
      heldRef.current = false;
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    latestOnLongPress.current();
  }

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: clearHoldTimer,
    onPointerCancel: clearHoldTimer,
    onContextMenu: handleContextMenu,
    onClick: handleClick,
  };
}
