"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatElapsed } from "@/features/brew/formatElapsed";
import type { BrewMethod } from "@/features/equipment/constants";
import { useDictionary } from "@/components/i18n/LocaleProvider";

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
  onStart,
  onStop,
}: {
  method: BrewMethod;
  targetTimeMs?: number;
  startedAtEpochMs: number | null;
  onStart: () => void;
  onStop: (elapsedMs: number) => void;
}) {
  const dict = useDictionary();
  const isRunning = startedAtEpochMs !== null;
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

  const elapsedMs = startedAtEpochMs !== null ? now - startedAtEpochMs : 0;

  return (
    <div className="rounded-card border border-border bg-surface py-8">
      <div className="flex items-center justify-between px-6">
        <span className="font-display text-lg text-ink">{dict.equipment.methodLabels[method]}</span>
        <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
          {isRunning ? dict.brew.running : dict.brew.paused}
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5">
        <span className="font-display text-6xl tabular-nums text-ink" role="timer" aria-live="off">
          {formatElapsed(elapsedMs)}
        </span>
        {targetTimeMs !== undefined && (
          <p className="text-xs text-ink-muted">
            {dict.brew.targetCaption} {formatElapsed(targetTimeMs)}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3 px-6">
        <button
          type="button"
          disabled={isRunning}
          onClick={() => {
            setNow(Date.now());
            onStart();
          }}
          aria-label={dict.brew.go}
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            isRunning ? "border border-border text-ink-muted" : "bg-coffee text-surface",
          )}
        >
          {dict.brew.go}
        </button>
        <button
          type="button"
          disabled={!isRunning}
          onClick={() => onStop(Date.now() - startedAtEpochMs!)}
          className={cn(
            "min-h-14 max-w-56 flex-1 rounded-full text-base font-medium",
            isRunning ? "bg-ink text-surface" : "border border-border text-ink-muted",
          )}
        >
          {dict.brew.stop}
        </button>
      </div>

      <p className="mx-auto mt-4 max-w-[240px] text-center text-xs text-ink-muted">{dict.brew.timerNote}</p>
    </div>
  );
}
