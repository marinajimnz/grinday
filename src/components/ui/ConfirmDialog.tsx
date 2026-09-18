"use client";

import { useEffect, useRef } from "react";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { buttonClassName, type Variant } from "@/components/ui/Button";

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
  // Sí/No reads fine on a question the dialog itself asks, but a caller that
  // can name the action ("Descartar") should — it's the last thing read
  // before something irreversible happens, and it's what makes the
  // destructive variant mean anything.
  confirmLabel,
  cancelLabel,
  confirmVariant = "primary",
}: {
  open: boolean;
  header?: React.ReactNode;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: Variant;
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
        <p className="text-center text-sm text-ink">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={buttonClassName("secondary", { className: "flex-1" })}
          >
            {cancelLabel ?? dict.common.no}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className={buttonClassName(confirmVariant, { className: "flex-1" })}
          >
            {confirmLabel ?? dict.common.yes}
          </button>
        </div>
      </div>
    </div>
  );
}
