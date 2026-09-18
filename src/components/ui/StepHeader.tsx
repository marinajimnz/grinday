import { cn } from "@/lib/cn";
import { IconChevronIzq } from "@/components/icons/pencil-icons";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// The step line every numbered flow in the app wears: adding a coffee,
// adding a machine, and the six steps of Preparar (which span two routes —
// method and coffee in /brew/new, then recipe/timer/photo/result in
// /brew/live/[draftId] — and read as one journey because of this).
//
// Six dashes rather than one filling bar: the flow has six discrete steps
// and the bar could only ever say "somewhere past two thirds". The step you
// are on is the last lit one, so the count and the drawing agree without
// the drawing having to be read.
//
// `name` is the short label for this step (CRONÓMETRO, FOTO…). `heading` is
// the full sentence for the steps that ask something ("¿Qué café vas a
// usar?"); where it's given it becomes the page's h2 and `name` drops to a
// plain label, so each step still has exactly one heading.
export function StepHeader({
  step,
  total = 6,
  name,
  heading,
  onBack,
  backLabel,
}: {
  step: number;
  total?: number;
  name: string;
  heading?: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  const dict = useDictionary();
  const Name = heading === undefined ? "h2" : "p";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* The back affordance lives in the step line because that's what
              it undoes — a step. It used to be a full secondary button
              sitting above the header, which read as an action of the step
              rather than a way out of it. Negative margin keeps the arrow
              optically flush with the text while the tap target stays 44px. */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel ?? dict.common.back}
              className="-my-2.5 -mx-3 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <IconChevronIzq aria-hidden className="size-4" />
            </button>
          )}
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            {dict.common.stepLabel} {step} {dict.common.stepOfLabel} {total}
          </p>
        </div>
        <Name className="text-right text-[11px] font-medium uppercase tracking-[0.1em] text-ink-muted">
          {name}
        </Name>
      </div>

      {/* Decorative: "Paso 4 de 6" above says all of this in words. */}
      <div aria-hidden className="mt-2.5 flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full", i < step ? "bg-ink" : "bg-border")}
          />
        ))}
      </div>

      {heading !== undefined && <h2 className="mt-5 font-display text-4xl text-ink">{heading}</h2>}
    </div>
  );
}
