import { IconFavorita } from "@/components/icons/pencil-icons";
import { BrewSummary } from "./BrewSummary";
import { PrepareWithRecipeButton } from "@/components/brew/PrepareWithRecipeButton";
import { Button } from "@/components/ui/Button";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import type { RecipeSourceAttempt } from "@/features/brew/draft";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// The three numbers on the card plus whatever seeding a new brew from it
// needs — a full BrewAttemptRow satisfies this, so the coffee page keeps
// passing one, but the dashboard can select just these columns instead of
// every taste score and snapshot on the row.
export type RecipeCardAttempt = RecipeSourceAttempt &
  Pick<BrewAttemptRow, "grind_seconds" | "extraction_ms" | "output_weight_g">;

export async function RecipeCard({
  attempt,
  coffeeId,
  coffeeName,
  roaster,
  targetBagId,
  userId,
  label,
  icon: Icon = IconFavorita,
  brewable = true,
}: {
  attempt: RecipeCardAttempt;
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  targetBagId: string;
  userId: string;
  label?: string;
  icon?: typeof IconFavorita;
  /** False when every bag of this coffee is finished: the recipe is still
   *  worth keeping, but there is nothing left to brew it from today. */
  brewable?: boolean;
}) {
  const dict = getDictionary(await getLocale());

  return (
    <div className="rounded-card border border-coffee/40 bg-surface p-5">
      <div className="flex items-center gap-1.5 text-coffee">
        <Icon aria-hidden className="size-4 text-coffee" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label ?? dict.dashboard.preferredRecipe}
        </span>
      </div>

      {/* It used to pick whichever three of five numbers this attempt
          happened to have, labelled underneath — which meant the same
          recipe showed different numbers depending on how it was logged,
          and a guided brew showed "— —s" because it never writes the
          grind. These are the three that say what a brew was, always the
          same three, in the same shape the attempt rows use. */}
      <BrewSummary attempt={attempt} dict={dict} size="lg" className="mt-3" />

      <div className="mt-4 flex gap-2">
        <Button
          href={`/attempts/${attempt.id}`}
          variant="secondary"
          className={brewable ? "flex-1" : "w-full"}
        >
          {dict.dashboard.viewAttempt} #{attempt.attempt_no}
        </Button>
        {brewable && (
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
        )}
      </div>

      {/* Said once, here, rather than as a disabled button that looks broken:
          the recipe is fine, the coffee is the thing that ran out. */}
      {!brewable && <p className="mt-2 text-xs text-ink-muted">{dict.recipes.noBagToBrew}</p>}
    </div>
  );
}
