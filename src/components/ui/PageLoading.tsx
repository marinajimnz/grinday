import { BeanSpinner } from "./BeanSpinner";

// Fallback UI for route-level loading.tsx files: Next.js shows this in
// place of a whole segment (layout included) while it's still resolving —
// e.g. the very first navigation into the app, or moving between pages —
// so it renders full-screen rather than assuming any chrome is on screen.
export function PageLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <BeanSpinner className="size-10 text-ink" />
    </div>
  );
}
