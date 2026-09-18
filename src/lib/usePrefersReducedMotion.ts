import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Reads the OS-level "reduce motion" setting, and keeps reading it — the
 * user can flip it while the app is open. Subscribed rather than sampled
 * into state so the server render has a definite answer (false, matching
 * the CSS default) instead of a flash of the wrong one.
 *
 * CSS handles this on its own wherever the motion is a stylesheet
 * animation; this is for motion that only exists in JS, like the timer cup,
 * where the component has to decide not to move rather than be told.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
