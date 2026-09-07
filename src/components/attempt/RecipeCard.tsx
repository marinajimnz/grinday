import { IconFavorita } from "@/components/icons/pencil-icons";
import { PrepareWithRecipeButton } from "@/components/brew/PrepareWithRecipeButton";
import { Button } from "@/components/ui/Button";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function RecipeCard({
  attempt,
  coffeeId,
  coffeeName,
  roaster,
  targetBagId,
  userId,
}: {
  attempt: BrewAttemptRow;
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  targetBagId: string;
  userId: string;
}) {
  const dict = getDictionary(await getLocale());

  return (
    <div className="rounded-card border border-coffee/40 bg-surface p-5">
      <div className="flex items-center gap-1.5 text-coffee">
        <IconFavorita aria-hidden className="size-4 text-coffee" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {dict.dashboard.preferredRecipe}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {attempt.grind_setting ?? "—"}
          </p>
          <p className="text-xs text-ink-muted">{dict.dashboard.grindSetting}</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {attempt.grind_seconds ?? "—"}s
          </p>
          <p className="text-xs text-ink-muted">{dict.dashboard.grindTime}</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {attempt.extraction_ms ? `${(attempt.extraction_ms / 1000).toFixed(1)}s` : "—"}
          </p>
          <p className="text-xs text-ink-muted">{dict.dashboard.extraction}</p>
        </div>
      </div>

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
