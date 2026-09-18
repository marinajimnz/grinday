"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/**
 * The cup from the pencil icon set, filling with the clock and spilling over
 * once the shot runs past its target. Ported from the Claude Design project
 * "SVG pencil-sketch coffee icons" (`export/CoffeeFillTimer.jsx`); the
 * geometry, the timings and the wave maths are that file's, kept as its
 * constants so they stay legible against the source.
 *
 * Purely decorative: every reading it shows — how far along, whether it's
 * past target, by how much — is also text right under it, so it's
 * aria-hidden and a screen reader never hears a word of it.
 */

// viewBox 24x24, the same grid as every other icon in the set.
const GEO = {
  cup: "M4.6 8.6 H16.2 c0 6 -1.7 8.6 -5.8 8.6 -4.1 0 -5.8 -2.6 -5.8 -8.6 Z",
  handle: "M16.4 10 c2.9 -0.7 3.7 0.6 3.7 2.2 0 1.7 -1.1 2.7 -3.3 2.4",
  inside: "M5.4 9.4 H15.4 c0 5.4 -1.5 7.6 -5.0 7.6 -3.5 0 -5.0 -2.2 -5.0 -7.6 Z",
  levelBottom: 16.8,
  levelTop: 9.1,
  innerLeft: 4.2,
  innerRight: 16.6,
  centerX: 10.4,
  centerY: 13,
  rimY: 8.7,
  // Where the saucer would be. The design's cup has one; at this size it
  // came out a grey slab the same weight as the cup itself, and the comps
  // this screen was drawn from don't show it — so the puddle lands on the
  // line rather than on a plate. The number stays: the drops fall to it and
  // the puddle spreads along it.
  saucerY: 19.9,
  strokeWidth: 1.9,
} as const;

// Seconds.
const TIMING = {
  hopDuration: 0.55, // the little jump the cup gives as it reaches the target
  hopHeight: 1.5,
  hopScale: 0.05,
  dropInterval: 0.5, // one drop over the rim every this often, once spilling
  dropFall: 0.62,
  dropFadeFrom: 0.88,
  shakeDuration: 0.34,
  shakeAmplitude: 0.42,
  spillDelay: 0.45, // grace past the target before the first drop
  puddleCycle: 3,
  puddleRamp: 6,
  waveSpeed: 2.6,
  rippleSpeed: 5.3,
} as const;

const WAVE = {
  amp: 0.8,
  ampSpilling: 1.1,
  pausedFactor: 0.5, // a held clock means a settling surface, not a still one
  rippleFactor: 0.35,
} as const;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const f = (n: number) => n.toFixed(2);

/** The coffee's surface at height `L`, wobbling on the elapsed clock. */
function waveEdge(L: number, elapsed: number, spilling: boolean, moving: boolean, flat: boolean) {
  const { innerLeft: X0, innerRight: X1, centerX } = GEO;
  const amp = flat ? 0 : (spilling ? WAVE.ampSpilling : WAVE.amp) * (moving ? 1 : WAVE.pausedFactor);
  const rip = amp * WAVE.rippleFactor;
  const a1 = amp * Math.sin(elapsed * TIMING.waveSpeed);
  const a2 = amp * Math.sin(elapsed * TIMING.waveSpeed + 2.1);
  const a3 = amp * Math.sin(elapsed * (TIMING.waveSpeed * 0.73) + 4.0);
  const r1 = rip * Math.sin(elapsed * TIMING.rippleSpeed);
  const r2 = rip * Math.sin(elapsed * TIMING.rippleSpeed + 1.7);
  return (
    `M${f(X0)} ${f(L + a1 * 0.5)}` +
    ` C${f(X0 + 1.6)} ${f(L - a1 - r1)} ${f(X0 + 3.1)} ${f(L + a2 + r2)} ${f(X0 + 4.3)} ${f(L + a2 * 0.4)}` +
    ` C${f(X0 + 5.6)} ${f(L - a2 - r2)} ${f(X0 + 7.2)} ${f(L + a3 + r1)} ${f(centerX)} ${f(L + a3 * 0.4)}` +
    ` C${f(centerX + 1.9)} ${f(L - a3 - r2)} ${f(X1 - 2.6)} ${f(L + a1 + r1)} ${f(X1 - 1.3)} ${f(L + a1 * 0.4)}` +
    ` C${f(X1 - 0.7)} ${f(L - a2 * 0.8)} ${f(X1 - 0.3)} ${f(L - a1 * 0.6)} ${f(X1)} ${f(L - a1 * 0.5)}`
  );
}

export function BrewCup({
  startedAtEpochMs,
  accumulatedMs = 0,
  targetMs,
  size = 188,
  className,
}: {
  startedAtEpochMs: number | null;
  accumulatedMs?: number;
  targetMs?: number;
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();
  const running = startedAtEpochMs !== null;
  const [now, setNow] = useState(() => Date.now());

  // The digits next door only need ten frames a second; the surface needs
  // sixty or it strobes. Keeping that loop in here means the expensive
  // repaint is this SVG alone, not the whole timer screen. requestAnimationFrame
  // also stops by itself in a backgrounded tab, and the level is derived from
  // the timestamps either way, so nothing drifts while it isn't drawing.
  useEffect(() => {
    if (!running) return;
    if (reduced) {
      const interval = setInterval(() => setNow(Date.now()), 250);
      return () => clearInterval(interval);
    }
    let raf = 0;
    function loop() {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, reduced]);

  const elapsed = (accumulatedMs + (startedAtEpochMs !== null ? now - startedAtEpochMs : 0)) / 1000;
  // No target means no idea how full "full" is, so the cup holds at a third
  // and just ripples — better than a cup that never fills or one that
  // pretends to know.
  const target = targetMs !== undefined ? targetMs / 1000 : 0;
  const t = target > 0 ? clamp(elapsed / target, 0, 1) : clamp(elapsed / 90, 0, 0.34);
  const L = GEO.levelBottom - (GEO.levelBottom - GEO.levelTop) * t;
  const over = target > 0 ? Math.max(0, elapsed - target) : 0;
  const spilling = over > TIMING.spillDelay;
  const hasLiquid = t > 0.02;
  const full = t >= 1;

  const edge = waveEdge(L, elapsed, spilling, running, reduced);
  const liquid = `${edge} L${f(GEO.innerRight)} 18.6 L${f(GEO.innerLeft)} 18.6 Z`;

  // Drops over the rim, alternating sides, and the flinch the cup gives as
  // each one goes. Only ever the last handful are in the air at once.
  const drops: { key: number; d: string; opacity: number }[] = [];
  let shakeX = 0;
  if (spilling && !reduced) {
    const n = Math.floor(over / TIMING.dropInterval);
    for (let k = Math.max(0, n - 3); k <= n; k++) {
      const p = (over - k * TIMING.dropInterval) / TIMING.dropFall;
      if (p < 0 || p > 1) continue;
      const left = k % 2 === 0;
      const x = (left ? 4.5 : 16.3) + (left ? -1 : 1) * (0.4 + p * 0.8);
      const y = GEO.rimY + Math.pow(p, 1.7) * (GEO.saucerY - GEO.rimY + 1.3);
      drops.push({
        key: k,
        d: `M${f(x)} ${f(y)} l0.02 0.02`,
        opacity: p > TIMING.dropFadeFrom ? (1 - p) / (1 - TIMING.dropFadeFrom) : 1,
      });
      const u = (over - k * TIMING.dropInterval) / TIMING.shakeDuration;
      if (u >= 0 && u <= 1 && running) {
        shakeX = Math.sin(u * Math.PI * 3) * TIMING.shakeAmplitude * (1 - u);
      }
    }
  }

  const grow = reduced ? 1 : 0.55 + 0.45 * Math.sin(((over % TIMING.puddleCycle) / TIMING.puddleCycle) * Math.PI);
  const hw = (1.5 + 4.2 * clamp(over / TIMING.puddleRamp, 0, 1)) * grow;
  const puddle =
    `M${f(GEO.centerX - hw)} ${f(GEO.saucerY)} Q${f(GEO.centerX - hw / 2)} ${f(GEO.saucerY + 0.5 * grow)} ${f(GEO.centerX)} ${f(GEO.saucerY)}` +
    ` Q${f(GEO.centerX + hw / 2)} ${f(GEO.saucerY + 0.42 * grow)} ${f(GEO.centerX + hw)} ${f(GEO.saucerY)}`;

  // The one beat of celebration in the whole flow: as the clock crosses the
  // target the cup hops and swells, once.
  const sinceTarget = elapsed - target;
  let hop = 0;
  let pulse = 1;
  if (!reduced && target > 0 && sinceTarget >= 0 && sinceTarget <= TIMING.hopDuration) {
    const u = sinceTarget / TIMING.hopDuration;
    hop = -TIMING.hopHeight * Math.sin(Math.PI * u);
    pulse = 1 + TIMING.hopScale * Math.sin(Math.PI * u);
  }
  const transform =
    `translate(${shakeX.toFixed(3)} ${hop.toFixed(3)}) translate(${GEO.centerX} ${GEO.centerY})` +
    ` scale(${pulse.toFixed(4)}) translate(${-GEO.centerX} ${-GEO.centerY})`;

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={GEO.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("overflow-visible text-ink", className)}
    >
      <defs>
        {/* The set's own pencil roughness — same turbulence, its own seeds,
            so this cup doesn't wobble in lockstep with the nav icons.
            The region is in user space rather than the default fraction of
            each object's own box: the saucer is a perfectly flat line, so a
            box-relative region has zero height and the filter renders it to
            nothing — the cup used to come with no saucer at all. */}
        <filter id={`${id}o`} filterUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves={3} seed={11} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={0.9} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`${id}d`} filterUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves={3} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={0.7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <clipPath id={`${id}c`}>
          <path d={GEO.inside} />
        </clipPath>
      </defs>

      <g transform={transform}>
        <g clipPath={`url(#${id}c)`}>
          {hasLiquid && <path d={liquid} fill="currentColor" stroke="none" filter={`url(#${id}d)`} />}
        </g>

        <g filter={`url(#${id}o)`}>
          <path d={GEO.cup} />
          <path d={GEO.handle} />
        </g>

        {hasLiquid && (
          <path d={edge} strokeWidth={1.6} filter={`url(#${id}d)`} clipPath={`url(#${id}c)`} />
        )}

        {full && (
          <g filter={`url(#${id}d)`} strokeWidth={1.4}>
            <path
              d="M8.1 6.6 c-1.1 -1.0 0.5 -1.9 -0.5 -3.0"
              className={reduced ? "opacity-70" : "animate-brew-steam"}
            />
            <path
              d="M11.0 6.2 c-1.2 -1.2 0.6 -2.2 -0.5 -3.4"
              className={reduced ? "opacity-70" : "animate-brew-steam"}
              style={reduced ? undefined : { animationDuration: "2.6s", animationDelay: "0.35s" }}
            />
            <path
              d="M13.9 6.6 c-1.1 -1.0 0.5 -1.9 -0.5 -3.0"
              className={reduced ? "opacity-70" : "animate-brew-steam"}
              style={reduced ? undefined : { animationDuration: "2.4s", animationDelay: "0.8s" }}
            />
          </g>
        )}
      </g>

      {/* Re-declaring the stroke on the group is what makes `currentColor`
          resolve against its own colour rather than the root's ink. */}
      {spilling && (
        <g filter={`url(#${id}d)`} stroke="currentColor" className="text-coffee">
          <path d={puddle} strokeWidth={1.7} opacity={0.45 + 0.55 * grow} />
          {drops.map((drop) => (
            <path key={drop.key} d={drop.d} strokeWidth={1.6} opacity={drop.opacity} />
          ))}
        </g>
      )}

    </svg>
  );
}
