"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// Back to wherever you came from — a profile is reached from Settings,
// search or favourites alike, so no single parent page is right. Opened
// straight from a link (nothing to go back to), it falls back to `fallbackHref`.
export function BackButton({ label, fallbackHref = "/" }: { label: string; fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={label}
      className="-ml-3 inline-flex min-h-11 min-w-11 items-center justify-center text-ink"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
    >
      <ChevronLeft aria-hidden className="size-6" />
    </button>
  );
}
