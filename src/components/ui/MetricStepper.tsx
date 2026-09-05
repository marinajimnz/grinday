"use client";

import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// Holding a +/- button down repeats the step instead of requiring one tap
// per increment — useful once a stepper's min/max span gets wide (e.g.
// temperature 0-100 by 1). A quick tap still applies via the normal click,
// so keyboard/screen-reader activation (which only ever fires a click,
// never pointer events) keeps working unchanged.
const HOLD_DELAY_MS = 400;
const REPEAT_MS = 90;
const FAST_REPEAT_MS = 40;
const TICKS_BEFORE_FAST = 15;

export function MetricStepper({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const dict = useDictionary();

  // Kept in sync every render so the interval below always reads the
  // latest props instead of the stale ones captured when the hold started.
  const latest = useRef({ value, onChange, step, min, max });
  useEffect(() => {
    latest.current = { value, onChange, step, min, max };
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heldRef = useRef(false);

  function clamp(n: number) {
    const { min: lo, max: hi } = latest.current;
    let v = n;
    if (lo !== undefined) v = Math.max(lo, v);
    if (hi !== undefined) v = Math.min(hi, v);
    return Math.round(v * 10) / 10;
  }

  function applyDelta(direction: 1 | -1) {
    const { value: current, step: s, onChange: change } = latest.current;
    change(clamp((current ?? 0) + s * direction));
  }

  function stopHold() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }

  function startHold(direction: 1 | -1) {
    heldRef.current = false;
    stopHold();
    timeoutRef.current = setTimeout(() => {
      heldRef.current = true;
      let ticks = 0;
      applyDelta(direction);
      intervalRef.current = setInterval(() => {
        applyDelta(direction);
        ticks += 1;
        if (ticks === TICKS_BEFORE_FAST) {
          clearInterval(intervalRef.current!);
          intervalRef.current = setInterval(() => applyDelta(direction), FAST_REPEAT_MS);
        }
      }, REPEAT_MS);
    }, HOLD_DELAY_MS);
  }

  function handleClick(direction: 1 | -1) {
    // The hold already applied its own steps — the trailing click that
    // fires on release would otherwise add one extra, unwanted step.
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    applyDelta(direction);
  }

  useEffect(() => stopHold, []);

  return (
    <div className="text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="mt-1.5 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label={`${dict.ui.decrease} ${label}`}
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={() => handleClick(-1)}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink"
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <span className="min-w-16 font-display text-3xl tabular-nums text-ink">
          {value ?? "—"}
          {value !== undefined && suffix ? <span className="text-lg">{suffix}</span> : null}
        </span>
        <button
          type="button"
          aria-label={`${dict.ui.increase} ${label}`}
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={() => handleClick(1)}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink"
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
