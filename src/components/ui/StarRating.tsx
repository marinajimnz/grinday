import { cn } from "@/lib/cn";
import { IconFavorita } from "@/components/icons/pencil-icons";

// Every rating in the app is one to five, so the row is always five stars
// — the empty ones carry the "out of five" that the old "4/5" spelled out.
const STARS = [1, 2, 3, 4, 5];

const DISPLAY_SIZES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

/**
 * A score you read. The stars are decorative; the number goes out to
 * screen readers as the "4/5" this replaced, so a reading of the tasting
 * grid still says "Acidez: 4/5" rather than counting shapes aloud.
 *
 * Deliberately no dictionary: three of the four callers are Client
 * Components and one is not, and a bare number needs no translating.
 */
export function StarRating({
  value,
  size = "md",
  className,
}: {
  value: number | null | undefined;
  size?: keyof typeof DISPLAY_SIZES;
  className?: string;
}) {
  if (value == null) return null;

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-coffee", className)}>
      <span className="sr-only">{value}/5</span>
      {STARS.map((n) => (
        <IconFavorita
          key={n}
          aria-hidden
          className={cn(DISPLAY_SIZES[size], n > value && "fill-none text-ink-muted")}
        />
      ))}
    </span>
  );
}

/**
 * A score you set. Still a radiogroup of five radios, as the numbered
 * buttons were — only the label of each is now the star rather than the
 * digit, so the aria-label carries the number the eye no longer reads.
 *
 * The boxes are gone: five bordered cells around five stars fought the
 * stars for attention, and a row of stars already says "tap one". The 44px
 * button stays, invisible, because the finger still needs it.
 */
export function StarRatingInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  return (
    <div id={id} role="radiogroup" aria-label={label} className="flex items-center">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={String(n)}
          onClick={() => onChange(n)}
          className="flex size-11 items-center justify-center rounded-input text-coffee outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink"
        >
          <IconFavorita
            aria-hidden
            className={cn("size-7", (value === undefined || n > value) && "fill-none text-ink-muted")}
          />
        </button>
      ))}
    </div>
  );
}
