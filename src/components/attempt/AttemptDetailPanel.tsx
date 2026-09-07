"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil } from "lucide-react";
import { IconFavorita } from "@/components/icons/pencil-icons";
import { EditAttemptForm } from "./EditAttemptForm";
import { Button } from "@/components/ui/Button";
import { TASTE_DIMENSIONS } from "@/features/attempts/constants";
import { setPreferredAttemptAction } from "@/features/attempts/actions";
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

      <div className="mt-4 flex flex-wrap gap-2">
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

        <Button
          href={`/attempts/new?coffeeBagId=${attempt.coffee_bag_id}&duplicateFrom=${attempt.id}`}
          variant="secondary"
          className="px-3"
        >
          <Copy aria-hidden className="size-4" />
          {dict.attempts.duplicateAndAdjust}
        </Button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label={dict.brew.grindSetting} value={attempt.grind_setting} />
        <Stat label={dict.attempts.grindSeconds} value={attempt.grind_seconds} />
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
              ? dict.enums.doseFeedback[attempt.dose_feedback as keyof typeof dict.enums.doseFeedback]
              : null
          }
        />
        <Stat label={dict.attempts.aBitMore} value={attempt.used_bit_more ? dict.attempts.yes : null} />
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
          value={attempt.temperature_offset_c != null ? `${attempt.temperature_offset_c} °C` : null}
        />
        <Stat label={dict.brew.upperBurr} value={attempt.upper_burr_setting} />
        <Stat
          label={dict.brew.shotMode}
          value={
            attempt.shot_mode
              ? dict.enums.shotMode[attempt.shot_mode as keyof typeof dict.enums.shotMode]
              : null
          }
        />
        <Stat
          label={dict.attempts.extraction}
          value={attempt.extraction_ms ? `${(attempt.extraction_ms / 1000).toFixed(1)} s` : null}
        />
        <Stat
          label={dict.attempts.preinfusionShort}
          value={attempt.preinfusion_ms ? `${attempt.preinfusion_ms} ms` : null}
        />
        <Stat
          label={dict.attempts.pressureObservation}
          value={
            attempt.pressure_observation
              ? dict.enums.pressureObservation[
                  attempt.pressure_observation as keyof typeof dict.enums.pressureObservation
                ]
              : null
          }
        />
        <Stat label={dict.attempts.input} value={attempt.input_weight_g ? `${attempt.input_weight_g} g` : null} />
        <Stat label={dict.attempts.output} value={attempt.output_weight_g ? `${attempt.output_weight_g} g` : null} />
        <Stat
          label={dict.attempts.volume}
          value={attempt.output_volume_ml ? `${attempt.output_volume_ml} ml` : null}
        />
      </dl>

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
    </div>
  );
}
