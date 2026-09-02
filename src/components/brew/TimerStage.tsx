"use client";

import { useEffect, useRef, useState } from "react";
import { formatElapsed } from "@/features/brew/formatElapsed";
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
  startedAtEpochMs,
  onStart,
  onStop,
}: {
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
    <div className="flex flex-col items-center gap-6 rounded-card border border-border bg-surface py-10">
      <span
        className="font-display text-6xl tabular-nums text-ink"
        role="timer"
        aria-live="off"
      >
        {formatElapsed(elapsedMs)}
      </span>

      {isRunning ? (
        <button
          type="button"
          onClick={() => onStop(Date.now() - startedAtEpochMs!)}
          className="min-h-14 w-48 rounded-full bg-ink text-base font-medium text-surface"
        >
          {dict.brew.stop}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setNow(Date.now());
            onStart();
          }}
          className="min-h-14 w-48 rounded-full bg-coffee text-base font-medium text-surface"
        >
          {dict.brew.startTimer}
        </button>
      )}

      <p className="max-w-[240px] text-center text-xs text-ink-muted">{dict.brew.timerNote}</p>
    </div>
  );
}
