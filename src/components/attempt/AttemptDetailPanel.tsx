"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil } from "lucide-react";
import { IconEliminar, IconFavorita } from "@/components/icons/pencil-icons";
import { EditAttemptForm } from "./EditAttemptForm";
import { AttemptRecipeSummary } from "./AttemptRecipeSummary";
import { BrewFromAttemptButton } from "@/components/brew/BrewFromAttemptButton";
import { SettingsAccordionCard } from "@/components/settings/SettingsAccordionCard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TASTE_DIMENSIONS } from "@/features/attempts/constants";
import { deleteAttemptAction, setPreferredAttemptAction } from "@/features/attempts/actions";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatDateTime } from "@/lib/i18n/format-date";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export function AttemptDetailPanel({
  attempt,
  coffeeId,
  isPreferred,
}: {
  attempt: BrewAttemptRow;
  coffeeId: string;
  isPreferred: boolean;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [isTogglingPreferred, startTogglePreferred] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteAttemptAction(attempt.id);
      if (!result.success) {
        setConfirmDeleteOpen(false);
        setDeleteError(result.message);
        return;
      }
      router.push(`/coffees/${coffeeId}`);
    });
  }

  if (editing) {
    return (
      <EditAttemptForm
        attempt={attempt}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  // The Sage-era columns the manual form still collects. They're real data
  // for whoever recorded them, but they're settings of one particular
  // machine — they don't belong in front of the recipe, and for anything
  // logged through the guided flow they're empty anyway.
  const machineFields = [
    attempt.upper_burr_setting,
    attempt.dose_mode,
    attempt.dose_feedback,
    attempt.basket_size,
    attempt.temperature_offset_c,
    attempt.shot_mode,
  ];
  const hasMachineFields = machineFields.some((v) => v !== null && v !== undefined);

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {dict.attempts.attemptNo} #{attempt.attempt_no}
          </h1>
          <p className="text-xs text-ink-muted">{formatDateTime(attempt.created_at, locale)}</p>
        </div>
        <Button variant="secondary" className="px-3" onClick={() => setEditing(true)}>
          <Pencil aria-hidden className="size-4" />
          {dict.attempts.correct}
        </Button>
      </div>

      {/* First thing on the page, because it's the reason you opened it:
          what you brewed, and whether to brew it again. */}
      <div className="mt-4">
        <AttemptRecipeSummary attempt={attempt} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <BrewFromAttemptButton attemptId={attempt.id} className="px-3">
          <Copy aria-hidden className="size-4" />
          {dict.attempts.duplicateAndAdjust}
        </BrewFromAttemptButton>

        <Button
          variant="secondary"
          className="border-coffee px-3 text-coffee"
          disabled={isTogglingPreferred}
          onClick={() =>
            startTogglePreferred(async () => {
              await setPreferredAttemptAction({
                coffeeId,
                attemptId: isPreferred ? null : attempt.id,
              });
              router.refresh();
            })
          }
        >
          <IconFavorita
            aria-hidden
            className={isPreferred ? "size-4 text-coffee" : "size-4 fill-none"}
          />
          {isPreferred ? dict.attempts.removeFromPreferred : dict.attempts.markAsPreferred}
        </Button>
      </div>

      {(TASTE_DIMENSIONS.some((d) => attempt[d] != null) || attempt.overall_rating) && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-ink-muted">{dict.attempts.tasting}</p>
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TASTE_DIMENSIONS.map((dim) => (
              <Stat
                key={dim}
                label={dict.enums.tasteDimension[dim]}
                value={attempt[dim] ? `${attempt[dim]}/5` : null}
              />
            ))}
            <Stat
              label={dict.brew.overallRating}
              value={attempt.overall_rating ? `${attempt.overall_rating}/5` : null}
            />
          </dl>
        </div>
      )}

      {attempt.notes && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-ink-muted">{dict.brew.notes}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{attempt.notes}</p>
        </div>
      )}

      {hasMachineFields && (
        <div className="mt-6">
          <SettingsAccordionCard title={dict.attempts.machineSettings}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label={dict.brew.upperBurr} value={attempt.upper_burr_setting} />
              <Stat
                label={dict.brew.doseMode}
                value={
                  attempt.dose_mode
                    ? dict.enums.doseMode[attempt.dose_mode as keyof typeof dict.enums.doseMode]
                    : null
                }
              />
              <Stat
                label={dict.attempts.doseFeedback}
                value={
                  attempt.dose_feedback
                    ? dict.enums.doseFeedback[
                        attempt.dose_feedback as keyof typeof dict.enums.doseFeedback
                      ]
                    : null
                }
              />
              <Stat
                label={dict.attempts.basketSize}
                value={
                  attempt.basket_size
                    ? dict.enums.basketSize[attempt.basket_size as keyof typeof dict.enums.basketSize]
                    : null
                }
              />
              <Stat
                label={dict.attempts.temperatureOffsetShort}
                value={
                  attempt.temperature_offset_c != null ? `${attempt.temperature_offset_c} °C` : null
                }
              />
              <Stat
                label={dict.brew.shotMode}
                value={
                  attempt.shot_mode
                    ? dict.enums.shotMode[attempt.shot_mode as keyof typeof dict.enums.shotMode]
                    : null
                }
              />
              {/* Only when it isn't already standing in for the dose above. */}
              <Stat
                label={dict.attempts.input}
                value={
                  attempt.dose_g != null && attempt.input_weight_g
                    ? `${attempt.input_weight_g} g`
                    : null
                }
              />
            </dl>
          </SettingsAccordionCard>
        </div>
      )}

      {deleteError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {deleteError}
        </p>
      )}

      {/* Deleting an attempt is rare and irreversible, so it sits apart at
          the end rather than carrying the heaviest fill on the page next to
          the two things you actually came to do. */}
      <div className="mt-6 border-t border-border pt-4">
        <Button
          variant="secondary"
          className="border-danger/40 px-3 text-danger"
          disabled={isDeleting}
          onClick={() => {
            setDeleteError(null);
            setConfirmDeleteOpen(true);
          }}
        >
          <IconEliminar aria-hidden className="size-4" />
          {dict.common.delete}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        message={dict.dashboard.deleteAttemptConfirm}
        confirmLabel={dict.common.delete}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
