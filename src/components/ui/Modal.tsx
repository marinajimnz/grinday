"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

// A centred dialog over a dimmed page. Unlike ConfirmDialog it takes any
// content, and it can be made impossible to dismiss (no onClose): for a
// question the app needs answered, Escape and clicking outside do nothing.
export function Modal({
  open,
  title,
  onClose,
  children,
  className,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Read through a ref so a caller passing a fresh arrow each render doesn't
  // re-run the effect below — which would pull focus back to the first
  // field on every keystroke.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      "input, textarea, button:not([disabled]), a[href]",
    );
    (firstFocusable ?? panelRef.current)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-lg outline-none",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl text-ink text-balance">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
