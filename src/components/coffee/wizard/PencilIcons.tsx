"use client";

import { useId } from "react";

// From the "SVG pencil-sketch coffee icons" Claude Design project
// (icons/svg/grano.svg, icons/svg/bolsa.svg) — 24x24, stroke=currentColor,
// roughened with feTurbulence/feDisplacementMap for the hand-drawn look.
// Filter ids are per-instance (useId) so multiple icons on one page don't
// collide.

export function GranoIcon({ className }: { className?: string }) {
  const filterId = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves={3} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <path d="M12 3.6 c4.6 0 8.4 3.8 8.4 8.4 0 4.6 -3.8 8.4 -8.4 8.4 -4.6 0 -8.4 -3.8 -8.4 -8.4 0 -4.6 3.8 -8.4 8.4 -8.4 Z" />
        <path d="M8.2 19 C11 16 11.4 12.7 9.4 10.1 7.4 7.5 8.6 5.4 11.4 3.8" />
      </g>
    </svg>
  );
}

export function BolsaIcon({ className }: { className?: string }) {
  const filterId = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={23} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <path d="M8 6.7 C6.6 11 6.2 16 6.4 20.4 H17.6 C17.8 16 17.4 11 16 6.7" />
        <path d="M8 6.7 c1.5 -1.3 6.5 -1.3 8 0" />
        <path d="M7.7 4.3 H16.3" strokeWidth={3} />
        <path d="M9.4 12 H14.6 V15.6 H9.4 Z" />
      </g>
    </svg>
  );
}
