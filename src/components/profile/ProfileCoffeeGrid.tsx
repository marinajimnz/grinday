import { IconCafe, IconFavorita } from "@/components/icons/pencil-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { CloneRecipeButton } from "./CloneRecipeButton";
import type { PublicCoffeeItem } from "@/features/profile/publicQueries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

// Read-only "adaptation" of CoffeeCard for someone else's profile: no
// cover photo (coffee_bags/coffee_media stay private, see Fase 8), no
// long-press menu, and no link into the owner-only coffee detail page.
export function ProfileCoffeeGrid({
  coffees,
  dict,
  isOwnProfile,
}: {
  coffees: PublicCoffeeItem[];
  dict: Dictionary;
  isOwnProfile: boolean;
}) {
  if (!coffees.length) {
    return (
      <EmptyState
        icon={IconCafe}
        title={dict.profile.noCoffeesTitle}
        description={dict.profile.noCoffeesDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {coffees.map((coffee) => (
        <article key={coffee.id} className="rounded-card border border-border bg-surface p-4">
          <p className="truncate font-semibold text-ink">{coffee.name}</p>
          <p className="truncate text-sm text-ink-muted">{coffee.roaster}</p>

          {coffee.preferredAttempt && (
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-ink-muted">
              <IconFavorita aria-hidden className="size-4 shrink-0 text-coffee" />
              <div className="flex flex-1 justify-between gap-2 tabular-nums">
                <span>
                  {coffee.preferredAttempt.grind_setting ?? "—"} {dict.dashboard.grindSetting}
                </span>
                <span>
                  {coffee.preferredAttempt.extraction_ms
                    ? `${(coffee.preferredAttempt.extraction_ms / 1000).toFixed(1)}s`
                    : "—"}
                </span>
              </div>
            </div>
          )}

          {coffee.preferredAttempt && !isOwnProfile && (
            <div className="mt-3">
              <CloneRecipeButton
                sourceAttemptId={coffee.preferredAttempt.id}
                dict={dict}
                className="w-full"
              />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
