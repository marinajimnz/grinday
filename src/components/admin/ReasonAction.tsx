"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type Variant } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { inputClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import type { ActionResult } from "@/features/moderation/actions";

// Every admin action takes a reason and a second, deliberate tap: the
// button opens a reason field in place, and only "Confirm" runs it. The
// reason goes to the log and to the affected account.
export function ReasonAction({
  label,
  variant = "secondary",
  run,
  successMessage,
}: {
  label: string;
  variant?: Variant;
  run: (reason: string) => Promise<ActionResult<string>>;
  successMessage?: (data: string | undefined) => string;
}) {
  const t = useDictionary().admin;
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant={variant}
          onClick={() => {
            setOpen(true);
            setDone(null);
          }}
        >
          {label}
        </Button>
        {done && (
          <p role="status" className="text-xs text-ink-muted">
            {done}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="w-full space-y-2 rounded-input border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await run(reason);
          if (!result.success) {
            setError(result.message);
            return;
          }
          setOpen(false);
          setReason("");
          setDone(successMessage ? successMessage(result.data) : t.done);
          router.refresh();
        });
      }}
    >
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label} · {t.reason}
      </label>
      <textarea
        id={id}
        required
        autoFocus
        rows={2}
        maxLength={500}
        placeholder={t.reasonPlaceholder}
        className={`${inputClassName} py-2`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant={variant === "destructive" ? "destructive" : "primary"} disabled={isPending || !reason.trim()}>
          <LoadingLabel loading={isPending}>{t.confirm}</LoadingLabel>
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
