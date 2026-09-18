"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatElapsed } from "@/features/brew/formatTime";
import type { BrewMethod } from "@/features/equipment/constants";
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
  method,
  targetTimeMs,
  startedAtEpochMs,
  accumulatedMs = 0,
  onStart,
  onPause,
  onStop,
  onReset,
}: {
  method: BrewMethod;
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

  // The one moment this screen exists for, and it used to pass in silence:
  // at 36.9s against a 27.0s target the card was byte-identical to 3s. The
  // person it's for has both hands busy and their eyes on the cup, so the
  // buzz is the part that actually lands; the badge change is for when the
  // phone can't vibrate (desktop, iOS Safari) or is on a hard surface.
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
    <div className="rounded-card border border-border bg-surface py-8">
      <div className="flex items-center justify-between px-6">
        <span className="font-display text-lg text-ink">{dict.equipment.methodLabels[method]}</span>
        {/* Nothing has run yet means no state worth announcing — this used
            to read "En pausa" before the clock had ever moved, which is the
            one thing it wasn't. */}
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
            reachedTarget && !isPaused ? "bg-ink text-surface" : "bg-canvas text-ink-muted",
            !isRunning && !isPaused && "invisible",
          )}
        >
          {/* Paused wins over the target: a frozen clock past its target
              still needs to say why it stopped moving, and the reading and
              its target sit right below anyway. */}
          {isPaused ? dict.brew.paused : reachedTarget ? dict.brew.targetReached : dict.brew.running}
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5">
        <span className="font-display text-6xl text-ink" role="timer" aria-live="off">
          <SteadyDigits value={formatElapsed(elapsedMs)} />
        </span>
        {targetTimeMs !== undefined && (
          <p
            className={cn(
              "text-sm",
              reachedTarget ? "font-semibold text-ink" : "text-ink-muted",
            )}
          >
            {dict.brew.targetCaption} {formatElapsed(targetTimeMs)}
          </p>
        )}
      </div>

      {/* Whichever control is live gets the wide filled pill, the other
          shrinks to its own label. Starting is the precision-timed action —
          you press it as you press the machine — and it used to be a 56px
          circle while the relaxed one (you've already watched the cup fill)
          was four times its size. The idle control can't be a circle now
          that both labels pass through it: "Play" fitted 56px, "Empezar"
          doesn't.

          Paused, the expected move is to carry on, so that one takes the
          wide pill and stopping steps back — but stopping stays reachable,
          because a brew you paused and then decided was finished should not
          have to be restarted to be saved. */}
      <div className="mt-6 flex items-center justify-center gap-3 px-6">
        {/* One control for the clock — start it, hold it, pick it back up —
            and one for ending the brew. Whichever is the expected next move
            takes the wide filled pill: start when nothing has run, stop
            while it's pouring, carry on when it's held. */}
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
          className={cn(
            "min-h-14 rounded-full",
            isRunning
              ? "shrink-0 border border-border px-5 text-sm font-medium text-ink-muted"
              : "max-w-56 flex-1 bg-ink text-base font-semibold text-surface",
          )}
        >
          {isRunning ? dict.brew.pause : isPaused ? dict.brew.resume : dict.brew.go}
        </button>
        <button
          type="button"
          disabled={!isRunning && !isPaused}
          onClick={() => onStop(elapsedMs)}
          className={cn(
            "min-h-14 rounded-full font-medium",
            isRunning
              ? "max-w-56 flex-1 bg-ink text-base text-surface"
              : "shrink-0 border border-border px-5 text-sm text-ink-muted",
          )}
        >
          {dict.brew.stop}
        </button>
      </div>

      {/* Only while paused: it throws the reading away, so it stays out of
          reach of the thumb going for "Continuar", and off screen entirely
          while the clock is moving. */}
      {isPaused && (
        <div className="mt-3 flex justify-center px-6">
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-input px-3 text-sm font-medium text-ink-muted underline"
          >
            {dict.brew.reset}
          </button>
        </div>
      )}

      <p className="mx-auto mt-4 max-w-[240px] text-center text-xs text-ink-muted">{dict.brew.timerNote}</p>
    </div>
  );
}
