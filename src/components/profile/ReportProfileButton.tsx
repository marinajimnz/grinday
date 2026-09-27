"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { inputClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { reportProfileAction, type ReportReason } from "@/features/moderation/actions";

const REASONS: ReportReason[] = ["impersonation", "spam", "inappropriate", "other"];

// "Report profile", quiet at the foot of someone else's public profile.
// Nothing happens to the profile on its own: the report waits in the
// admin's queue, and the person never learns who sent it.
export function ReportProfileButton({ username }: { username: string }) {
  const t = useDictionary().report;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setReason(null);
    setDetails("");
    setSent(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-muted underline"
      >
        <Flag aria-hidden className="size-4" />
        {t.open}
      </button>

      <Modal open={open} title={sent ? t.thanks : t.title} onClose={isPending ? undefined : close}>
        {sent ? (
          <div className="mt-4">
            <Button type="button" fullWidth onClick={close}>
              {t.close}
            </Button>
          </div>
        ) : (
          <form
            className="mt-3 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reason) {
                setError(t.invalid);
                return;
              }
              setError(null);
              startTransition(async () => {
                const result = await reportProfileAction({ username, reason, details });
                if (!result.success) {
                  setError(result.message);
                  return;
                }
                setSent(true);
              });
            }}
          >
            <p className="text-sm text-ink-muted">{t.intro}</p>
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium text-ink">{t.reasonLabel}</legend>
              {REASONS.map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-input border border-border px-3 text-sm text-ink has-[:checked]:border-ink"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  {t.reasons[value]}
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor="report-details" className="mb-1.5 block text-sm font-medium text-ink">
                {t.details}
              </label>
              <textarea
                id="report-details"
                rows={3}
                maxLength={500}
                placeholder={t.detailsPlaceholder}
                className={`${inputClassName} py-2`}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button type="submit" fullWidth disabled={isPending}>
                <LoadingLabel loading={isPending} loadingText={t.sending}>
                  {t.send}
                </LoadingLabel>
              </Button>
              <Button type="button" variant="secondary" fullWidth disabled={isPending} onClick={close}>
                {t.cancel}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
