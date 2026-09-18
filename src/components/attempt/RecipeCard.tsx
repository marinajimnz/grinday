import { IconFavorita } from "@/components/icons/pencil-icons";
import { PrepareWithRecipeButton } from "@/components/brew/PrepareWithRecipeButton";
import { Button } from "@/components/ui/Button";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import type { RecipeSourceAttempt } from "@/features/brew/draft";
import { formatDuration } from "@/features/brew/formatTime";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// The three numbers on the card plus whatever seeding a new brew from it
// needs — a full BrewAttemptRow satisfies this, so the coffee page keeps
// passing one, but the dashboard can select just these columns instead of
// every taste score and snapshot on the row.
export type RecipeCardAttempt = RecipeSourceAttempt &
  Pick<BrewAttemptRow, "grind_seconds" | "extraction_ms" | "output_weight_g">;

const GRID_COLS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as const;

export async function RecipeCard({
  attempt,
  coffeeId,
  coffeeName,
  roaster,
  targetBagId,
  userId,
  label,
  icon: Icon = IconFavorita,
}: {
  attempt: RecipeCardAttempt;
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  targetBagId: string;
  userId: string;
  label?: string;
  icon?: typeof IconFavorita;
}) {
  const dict = getDictionary(await getLocale());

  // The guided brew flow never writes grind_setting or grind_seconds — only
  // the manual attempt form does (features/attempts/actions.ts) — so a card
  // hard-wired to those two showed "— —s" for every brew logged the normal
  // way. Show the three values this attempt actually has instead, in the
  // order a person would read a recipe back, and keep the time anchored in
  // the last slot because it's the one number you watch while brewing.
  const brewWeight = attempt.target_weight_g ?? attempt.output_weight_g;
  const candidates = [
    attempt.grind_setting != null && {
      value: String(attempt.grind_setting),
      label: dict.dashboard.grindSetting,
    },
    attempt.grind_seconds != null && {
      value: `${attempt.grind_seconds}s`,
      label: dict.dashboard.grindTime,
    },
    attempt.dose_g != null && { value: `${attempt.dose_g} g`, label: dict.dashboard.dose },
    attempt.water_g != null && { value: `${attempt.water_g} g`, label: dict.dashboard.water },
    brewWeight != null && { value: `${brewWeight} g`, label: dict.dashboard.brewWeight },
  ].filter((m): m is { value: string; label: string } => Boolean(m));

  const time =
    attempt.extraction_ms != null
      ? {
          value: formatDuration(attempt.extraction_ms),
          label: dict.dashboard.extraction,
        }
      : null;
  const metrics = time ? [...candidates.slice(0, 2), time] : candidates.slice(0, 3);

  return (
    <div className="rounded-card border border-coffee/40 bg-surface p-5">
      <div className="flex items-center gap-1.5 text-coffee">
        <Icon aria-hidden className="size-4 text-coffee" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label ?? dict.dashboard.preferredRecipe}
        </span>
      </div>

      {metrics.length > 0 && (
        <div className={`mt-3 grid gap-3 ${GRID_COLS[metrics.length as 1 | 2 | 3]}`}>
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-2xl font-semibold tabular-nums text-ink">{m.value}</p>
              <p className="text-xs text-ink-muted">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button href={`/attempts/${attempt.id}`} variant="secondary" className="flex-1">
          {dict.dashboard.viewAttempt} #{attempt.attempt_no}
        </Button>
        <PrepareWithRecipeButton
          coffeeId={coffeeId}
          coffeeBagId={targetBagId}
          coffeeName={coffeeName}
          roaster={roaster}
          userId={userId}
          sourceAttempt={attempt}
          className="flex-1"
        >
          {dict.dashboard.prepareWithRecipe}
        </PrepareWithRecipeButton>
      </div>
    </div>
  );
}
