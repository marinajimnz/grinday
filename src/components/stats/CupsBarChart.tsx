import { cn } from "@/lib/cn";
import {
  formatBucketDayLong,
  formatBucketMonth,
  formatBucketMonthLong,
  formatBucketWeekday,
} from "@/lib/i18n/format-date";
import type { CupBucket } from "@/features/stats/queries";
import type { PeriodRange } from "@/features/stats/period";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";

const MIN_BAR = 8;
const MAX_BAR = 56;

/**
 * One bar per day or per month across the whole period, drawn from the
 * period's own bucket list rather than from the rows that came back — a
 * week with three quiet days still has seven bars, and the shape of the
 * month is the point.
 *
 * Every bar keeps a visible stub at zero. A row of full-height bars with
 * gaps knocked out of it reads as missing data; a row of stubs reads as
 * days you didn't brew, which is what it is.
 */
export function CupsBarChart({
  range,
  buckets,
  dict,
  locale,
}: {
  range: PeriodRange;
  buckets: CupBucket[];
  dict: Dictionary;
  locale: Locale;
}) {
  const byStart = new Map(buckets.map((b) => [b.bucketStart, b.cups]));
  const values = range.buckets.map((start) => ({ start, cups: byStart.get(start) ?? 0 }));
  const peak = Math.max(...values.map((v) => v.cups));

  // Nothing at all: the caller shows its own empty line instead of a row
  // of identical stubs pretending to be a chart.
  if (peak === 0) return null;

  // Only the single busiest bucket is marked. Two bars tied at the top
  // would both be "your busiest", which is a sentence the caption can't
  // write, so the first one wins and the caption names it.
  const peakIndex = values.findIndex((v) => v.cups === peak);
  const isMonthly = range.bucket === "month";
  // A month's 28-31 bars can't each carry a label at phone width; the
  // busiest one is named underneath in words instead.
  const showTicks = isMonthly || range.period === "week";

  return (
    <div>
      <div className="flex items-end justify-center gap-1" style={{ height: MAX_BAR }}>
        {values.map((v, i) => (
          <div
            key={v.start}
            className={cn(
              "min-w-0 flex-1 rounded-sm",
              i === peakIndex ? "bg-ink" : "bg-border",
            )}
            style={{ height: Math.max(MIN_BAR, Math.round((v.cups / peak) * MAX_BAR)) }}
          />
        ))}
      </div>

      {showTicks && (
        <div className="mt-1.5 flex justify-center gap-1" aria-hidden>
          {values.map((v) => (
            <span
              key={v.start}
              className="min-w-0 flex-1 text-center text-[10px] leading-none text-ink-muted"
            >
              {isMonthly ? formatBucketMonth(v.start, locale) : formatBucketWeekday(v.start, locale)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-center text-xs text-ink-muted">
        {isMonthly
          ? `${capitalise(formatBucketMonthLong(values[peakIndex].start, locale))} ${dict.stats.busiestMonth}`
          : `${capitalise(formatBucketDayLong(values[peakIndex].start, locale))} ${dict.stats.busiestDay}`}
      </p>
    </div>
  );
}

// Spanish month and day names come back lower-case, and this one starts a
// sentence.
function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
