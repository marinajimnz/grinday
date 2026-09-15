import { useDictionary } from "@/components/i18n/LocaleProvider";

// Shared step header for the whole "Preparar" journey — method + coffee
// pick in /brew/new, then recipe/timer/photo/result in /brew/live/[draftId]
// — so the progress bar reads as one continuous 6-step flow across both
// routes.
export function BrewStepHeader({
  step,
  total = 6,
  title,
}: {
  step: number;
  total?: number;
  title: string;
}) {
  const dict = useDictionary();

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {dict.equipment.stepLabel} {step} {dict.equipment.stepOfLabel} {total}
      </p>
      <h2 className="font-display text-4xl text-ink">{title}</h2>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
        <div
          className="h-full rounded-full bg-ink transition-[width]"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
