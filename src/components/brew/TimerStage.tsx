"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatElapsed } from "@/features/brew/formatTime";
import { BrewCup } from "./BrewCup";
import { useDictionary } from "@/components/i18n/LocaleProvider";

/**
 * Bagel Fat One has no tabular figures, so `tabular-nums` on the timer was
 * inert: a "1" measures 28.1px where a "4" measures 41.6px at 60px, and the
 * centred string swung between 197px and 239px — visibly breathing outwards
 * ten times a second as the tenths ticked. Giving every digit the width of
 * the widest one holds the line still without giving up the display face.
 * Separators keep their own width; they never change.
 */
function SteadyDigits({ value }: { value: string }) {
  return (
    <>
      {[...value].map((char, i) =>
        char >= "0" && char <= "9" ? (
          <span key={i} className="inline-block w-[0.7em] text-center">
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        ),
      )}
    </>
  );
}

/**
 * Timestamp-anchored timer: the displayed value is always
 * `now - startedAtEpochMs`, where `now` is refreshed from Date.now() inside
 * effects/intervals (never read directly in the render body, to keep render
 * pure). setInterval only triggers the refresh — it is never the source of
 * truth — so throttled or missed ticks in a backgrounded tab self-correct on
 * the next tick or on regaining visibility, instead of drifting from
 * accumulated tick counts.
 */
export function TimerStage({
  targetTimeMs,
  startedAtEpochMs,
  accumulatedMs = 0,
  onStart,
  onPause,
  onStop,
  onReset,
}: {
  targetTimeMs?: number;
  startedAtEpochMs: number | null;
  accumulatedMs?: number;
  onStart: () => void;
  onPause: (elapsedMs: number) => void;
  onStop: (elapsedMs: number) => void;
  onReset: () => void;
}) {
  const dict = useDictionary();
  const isRunning = startedAtEpochMs !== null;
  const isPaused = !isRunning && accumulatedMs > 0;
  const [now, setNow] = useState(() => Date.now());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    function recompute() {
      setNow(Date.now());
    }
    document.addEventListener("visibilitychange", recompute);
    return () => document.removeEventListener("visibilitychange", recompute);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeLockRef.current = lock;
      })
      .catch(() => {
        // Not fatal — the timer keeps working, the screen just might sleep.
      });
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [isRunning]);

  // Banked time plus whatever the current run has added — so the reading
  // survives a pause instead of starting over at zero.
  const elapsedMs = accumulatedMs + (startedAtEpochMs !== null ? now - startedAtEpochMs : 0);
  const reachedTarget = targetTimeMs !== undefined && elapsedMs >= targetTimeMs && elapsedMs > 0;
  // The cup gives the target half a second of grace before the first drop
  // goes over the rim; the reading turns with it rather than a beat early.
  const overMs = targetTimeMs !== undefined ? Math.max(0, elapsedMs - targetTimeMs) : 0;
  const overflowing = targetTimeMs !== undefined && overMs > 450;

  // The one moment this screen exists for, and it used to pass in silence:
  // at 36.9s against a 27.0s target the card was byte-identical to 3s. The
  // person it's for has both hands busy and their eyes on the cup, so the
  // buzz is the part that actually lands; the cup filling, hopping and then
  // spilling over is for when the phone can't vibrate (desktop, iOS Safari)
  // or is lying on a hard surface.
  const buzzedRef = useRef(false);
  useEffect(() => {
    // Rearmed by a reset, not by a pause — pausing past the target and
    // resuming shouldn't buzz a second time for the same shot.
    if (elapsedMs === 0) {
      buzzedRef.current = false;
      return;
    }
    if (!isRunning || !reachedTarget || buzzedRef.current) return;
    buzzedRef.current = true;
    navigator.vibrate?.([120, 60, 120]);
  }, [isRunning, reachedTarget, elapsedMs]);

  return (
    <div>
      <div className="flex flex-col items-center">
        <div className="flex h-[210px] w-full items-center justify-center">
          <BrewCup
            startedAtEpochMs={startedAtEpochMs}
            accumulatedMs={accumulatedMs}
            targetMs={targetTimeMs}
            className="max-w-full"
          />
        </div>

        <span
          role="timer"
          aria-live="off"
          className={cn(
            "font-display text-[56px] leading-none",
            overflowing ? "text-coffee" : "text-ink",
          )}
        >
          <SteadyDigits value={formatElapsed(elapsedMs)} />
        </span>

        {targetTimeMs !== undefined && (
          <p className="mt-1.5 text-sm text-ink-muted">
            {overflowing
              ? `+${(overMs / 1000).toFixed(1)}s ${dict.brew.overTargetCaption} ${formatElapsed(targetTimeMs)}`
              : `${dict.brew.targetCaption} ${formatElapsed(targetTimeMs)}`}
          </p>
        )}

        {/* The cup says all of this in pictures and the numbers above say it
            in numbers; this is the same sentence for a screen reader, which
            gets neither. Polite, so it waits for a gap rather than talking
            over the reading. */}
        <p role="status" className="sr-only">
          {isPaused ? dict.brew.paused : reachedTarget ? dict.brew.targetReached : isRunning ? dict.brew.running : ""}
        </p>
      </div>

      {/* One control for the clock — start it, hold it, pick it back up —
          and one for ending the brew. The clock's keeps the wide filled
          pill throughout: it's the control you press as you press the
          machine, and it used to swap places with "Parar" mid-shot, moving
          the target under a thumb that was already on its way. */}
      <div className="mt-8 flex items-stretch gap-3">
        <button
          type="button"
          onClick={() => {
            if (isRunning) {
              onPause(Date.now() - startedAtEpochMs!);
              return;
            }
            setNow(Date.now());
            onStart();
          }}
          className="min-h-14 flex-1 rounded-full bg-ink text-[17px] font-semibold text-surface outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {isRunning ? dict.brew.pause : isPaused ? dict.brew.resume : dict.brew.go}
        </button>
        {/* Stopping stays reachable while paused: a brew you held and then
            decided was finished should not have to be restarted to be
            saved. With nothing on the clock there is nothing to stop, and
            the button says so by dimming rather than by looking live and
            doing nothing. */}
        <button
          type="button"
          disabled={!isRunning && !isPaused}
          onClick={() => onStop(elapsedMs)}
          className="min-h-14 w-28 shrink-0 rounded-full border-[1.5px] border-border text-base font-medium text-ink-muted outline-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {dict.brew.stop}
        </button>
      </div>

      <p className="mx-auto mt-3 max-w-[280px] text-center text-xs text-ink-muted">{dict.brew.timerNote}</p>

      {/* Only while paused: it throws the reading away, so it stays out of
          reach of the thumb going for "Continuar", and off screen entirely
          while the clock is moving. */}
      {isPaused && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-input px-3 text-sm font-medium text-ink-muted underline"
          >
            {dict.brew.reset}
          </button>
        </div>
      )}
    </div>
  );
}
