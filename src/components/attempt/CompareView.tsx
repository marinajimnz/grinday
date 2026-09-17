import { IconFavorita } from "@/components/icons/pencil-icons";
import { cn } from "@/lib/cn";
import { BrewFromAttemptButton } from "@/components/brew/BrewFromAttemptButton";
import { getCompareFields } from "@/features/attempts/compareFields";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";
import { formatDate } from "@/lib/i18n/format-date";

// The field-label column stays put while the attempt columns scroll
// horizontally — this class (matching each row's own background) is what
// keeps it readable instead of the scrolling content showing through.
const stickyLabelCell = "sticky left-0 z-10 whitespace-nowrap px-3 py-2 text-left";

// A group divider row ("Técnico" / "Cata") — a plain render helper, not a
// component, so it can't get flagged for being defined inside CompareView.
function renderSectionRow(label: string, attempts: BrewAttemptRow[]) {
  return (
    <tr key={label}>
      <th scope="row" className={cn(stickyLabelCell, "bg-canvas text-[11px] font-medium uppercase tracking-wide text-ink-muted")}>
        {label}
      </th>
      {attempts.map((attempt) => (
        <td key={attempt.id} className="bg-canvas" />
      ))}
    </tr>
  );
}

export function CompareView({
  attempts,
  preferredAttemptId,
  dict,
  locale,
}: {
  attempts: BrewAttemptRow[];
  preferredAttemptId: string | null;
  dict: Dictionary;
  locale: Locale;
}) {
  const compareFields = getCompareFields(dict);
  const valuesByField = new Map(
    compareFields.map((field) => [field.key, attempts.map((a) => field.format(a))]),
  );

  function differs(fieldKey: string) {
    const values = valuesByField.get(fieldKey) ?? [];
    return new Set(values).size > 1;
  }

  const technicalFields = compareFields.filter((f) => f.group === "technical");
  const sensoryFields = compareFields.filter((f) => f.group === "sensory");
  const hasNotes = attempts.some((a) => a.notes);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className={cn(stickyLabelCell, "bg-canvas")} />
            {attempts.map((attempt) => (
              <th
                key={attempt.id}
                className="min-w-[130px] border-b border-border bg-canvas px-3 py-2 text-left align-bottom"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-lg text-ink">#{attempt.attempt_no}</span>
                  {attempt.id === preferredAttemptId && (
                    <IconFavorita aria-label={dict.attempts.preferred} className="size-4 shrink-0 text-coffee" />
                  )}
                </div>
                <p className="text-xs font-normal text-ink-muted">{formatDate(attempt.created_at, locale)}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderSectionRow(dict.attempts.technical, attempts)}
          {technicalFields.map((field) => (
            <tr key={field.key}>
              <th scope="row" className={cn(stickyLabelCell, "border-b border-border bg-surface font-normal text-ink-muted")}>
                {field.label}
              </th>
              {attempts.map((attempt, index) => (
                <td key={attempt.id} className="border-b border-border bg-surface px-3 py-2 text-ink">
                  <span
                    className={cn(differs(field.key) && "rounded-full bg-canvas px-2 py-0.5 font-medium")}
                  >
                    {valuesByField.get(field.key)?.[index]}
                  </span>
                </td>
              ))}
            </tr>
          ))}

          {renderSectionRow(dict.attempts.tasting, attempts)}
          {sensoryFields.map((field) => (
            <tr key={field.key}>
              <th scope="row" className={cn(stickyLabelCell, "border-b border-border bg-surface font-normal text-ink-muted")}>
                {field.label}
              </th>
              {attempts.map((attempt, index) => (
                <td key={attempt.id} className="border-b border-border bg-surface px-3 py-2 text-ink">
                  <span
                    className={cn(differs(field.key) && "rounded-full bg-canvas px-2 py-0.5 font-medium")}
                  >
                    {valuesByField.get(field.key)?.[index]}
                  </span>
                </td>
              ))}
            </tr>
          ))}

          {hasNotes && (
            <tr>
              <th scope="row" className={cn(stickyLabelCell, "border-b border-border bg-surface align-top font-normal text-ink-muted")}>
                {dict.brew.notes}
              </th>
              {attempts.map((attempt) => (
                <td key={attempt.id} className="border-b border-border bg-surface px-3 py-2 align-top text-ink">
                  {attempt.notes ?? "—"}
                </td>
              ))}
            </tr>
          )}

          <tr>
            <th scope="row" className={cn(stickyLabelCell, "bg-surface")} />
            {attempts.map((attempt) => (
              <td key={attempt.id} className="bg-surface px-3 py-3 align-top">
                <BrewFromAttemptButton attemptId={attempt.id} fullWidth className="px-3">
                  {dict.attempts.useAsBase}
                </BrewFromAttemptButton>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
