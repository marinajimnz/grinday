"use client";

import { useEffect, useRef } from "react";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// A confirm()/alert() replacement: window.confirm() is real browser chrome
// (Chrome adds its own "prevent this page from creating additional
// dialogs" checkbox to it, which no page script can remove), so anywhere
// that needs a clean confirm/cancel prompt with no extra options renders
// this instead.
export function ConfirmDialog({
  open,
  header,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  header?: React.ReactNode;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dict = useDictionary();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {header}
        <p className="text-sm text-ink">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-input border border-border px-4 text-sm font-medium text-ink"
          >
            {dict.common.no}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-input bg-ink px-4 text-sm font-medium text-surface"
          >
            {dict.common.yes}
          </button>
        </div>
      </div>
    </div>
  );
}
