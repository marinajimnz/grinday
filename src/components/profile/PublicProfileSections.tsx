import Link from "next/link";
import { IconCafe, IconFavorita, IconMolinillo } from "@/components/icons/pencil-icons";
import { BrewSummary } from "@/components/attempt/BrewSummary";
import { StarRating } from "@/components/ui/StarRating";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import type { BrewMethod } from "@/features/equipment/constants";
import type { PublicAttempt, PublicCoffee, PublicEquipment } from "@/features/profile/publicQueries";
import type { BrewSummaryAttempt } from "@/components/attempt/BrewSummary";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";
import { formatRelativeDay } from "@/lib/i18n/format-date";
import { ExpandableSection } from "./ExpandableSection";
import { TryRecipeButton } from "./TryRecipeButton";

function methodLabel(dict: Dictionary, method: string | null) {
  if (!method) return null;
  return dict.equipment.methodLabels[method as BrewMethod] ?? method;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PublicCoffeesSection({
  coffees,
  username,
  dict,
  asRoaster = false,
}: {
  coffees: PublicCoffee[];
  username: string;
  dict: Dictionary;
  // A roaster's catalogue: the roaster is the page itself, so each card
  // leads with the origin instead.
  asRoaster?: boolean;
}) {
  if (coffees.length === 0) return null;
  const t = dict.publicProfile;

  return (
    <ExpandableSection
      title={asRoaster ? t.roasterCoffees : t.sectionCoffees}
      listClassName="grid grid-cols-2 gap-3"
      items={coffees.map((coffee) => (
        <li key={coffee.id}>
          <Link
            href={`/u/${username}/coffees/${coffee.id}`}
            className="block h-full overflow-hidden rounded-card border border-border bg-surface outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <div className="flex h-20 items-center justify-center bg-canvas text-ink-muted">
              <IconCafe aria-hidden className="size-6" />
            </div>
            <div className="p-3">
              <p className="truncate text-xs text-ink-muted">
                {asRoaster ? [coffee.country, coffee.process].filter(Boolean).join(" · ") || "\u00a0" : coffee.roaster}
              </p>
              <p className="mt-0.5 font-display text-base leading-tight break-words text-ink">{coffee.name}</p>
              {coffee.hasRecipe && (
                <p className="mt-1.5 flex items-start gap-1 text-xs text-ink-muted">
                  <IconFavorita aria-hidden className="mt-px size-3.5 shrink-0 text-coffee" />
                  <span className="min-w-0">
                    {[t.recipe, methodLabel(dict, coffee.recipeMethod), coffee.recipeGrind && t.grind.replace("{grind}", coffee.recipeGrind)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    />
  );
}

export function PublicEquipmentSection({ equipment, dict }: { equipment: PublicEquipment[]; dict: Dictionary }) {
  if (equipment.length === 0) return null;
  const t = dict.publicProfile;

  return (
    <Section title={t.sectionEquipment}>
      <ul className="space-y-2">
        {equipment.map((item, i) => {
          const isGrinder = item.kind === "grinder";
          const Icon = isGrinder ? IconMolinillo : (METHOD_ICONS[item.kind as BrewMethod] ?? IconCafe);
          return (
            <li
              key={`${item.kind}-${item.modelName}-${i}`}
              className="flex min-h-12 items-center gap-3 rounded-card border border-border bg-surface px-4 py-2.5"
            >
              <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.modelName}</span>
              <span className="shrink-0 text-xs text-ink-muted">
                {isGrinder ? t.grinder : methodLabel(dict, item.kind)}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// A bare "YYYY-MM-DD" (the day, in the app's zone — never the time) read
// as that calendar day, not as UTC midnight.
function calendarDay(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

type RowAttempt = BrewSummaryAttempt & {
  id: string;
  brewedOn: string;
  method: string;
  overallRating: number | null;
};

// One attempt in a public list; opens its setup. `subtitle` names the
// coffee on the profile, where attempts of different coffees are mixed.
export function PublicAttemptRow({
  attempt,
  username,
  subtitle,
  highlighted = false,
  preferredLabel = true,
  dict,
  locale,
}: {
  attempt: RowAttempt;
  username: string;
  subtitle?: string;
  highlighted?: boolean;
  // Off where a "Preferred recipe" heading already says it.
  preferredLabel?: boolean;
  dict: Dictionary;
  locale: Locale;
}) {
  const Icon = METHOD_ICONS[attempt.method as BrewMethod] ?? IconCafe;
  return (
    <Link
      href={`/u/${username}/attempts/${attempt.id}`}
      className={cn(
        "flex items-center gap-2.5 rounded-card border bg-surface p-4 outline-none focus-visible:ring-2 focus-visible:ring-ink",
        highlighted ? "border-coffee/40" : "border-border",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-ink">{methodLabel(dict, attempt.method)}</span>
          <span className="text-xs text-ink-muted">
            {formatRelativeDay(calendarDay(attempt.brewedOn), locale, {
              today: dict.dashboard.today,
              yesterday: dict.dashboard.yesterday,
            })}
          </span>
          {attempt.overallRating != null && (
            <span className="ml-auto shrink-0">
              <StarRating value={attempt.overallRating} size="sm" />
            </span>
          )}
        </div>
        {(subtitle || (highlighted && preferredLabel)) && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-muted">
            {highlighted && preferredLabel && <IconFavorita aria-hidden className="size-3.5 shrink-0 text-coffee" />}
            {subtitle ?? dict.publicProfile.preferredRecipe}
          </p>
        )}
        <BrewSummary attempt={attempt} dict={dict} className="mt-1" />
      </div>
    </Link>
  );
}

export function PublicAttemptsSection({
  attempts,
  username,
  dict,
  locale,
}: {
  attempts: PublicAttempt[];
  username: string;
  dict: Dictionary;
  locale: Locale;
}) {
  if (attempts.length === 0) return null;
  const t = dict.publicProfile;

  return (
    <ExpandableSection
      title={t.sectionAttempts}
      listClassName="space-y-2"
      items={attempts.map((attempt) => (
        <li key={attempt.id}>
          <PublicAttemptRow
            attempt={attempt}
            username={username}
            subtitle={`${attempt.coffeeName} · ${attempt.roaster}`}
            dict={dict}
            locale={locale}
          />
        </li>
      ))}
    />
  );
}

// The roaster's recommended recipe: the preferred recipe of the coffee at
// the top of its catalogue, in the same card shape as Home's preferred one.
export function RecommendedRecipeCard({
  coffeeName,
  attempt,
  username,
  canTry,
  dict,
}: {
  coffeeName: string;
  attempt: RowAttempt & { grind: string | null };
  username: string;
  // Not on your own page.
  canTry: boolean;
  dict: Dictionary;
}) {
  const t = dict.publicProfile;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">{t.recommendedRecipe}</h2>
      <div className="mt-3 rounded-card border border-coffee/40 bg-surface p-5">
        <div className="flex items-center gap-1.5 text-coffee">
          <IconFavorita aria-hidden className="size-4" />
          <span className="text-xs font-medium tracking-wide uppercase">{coffeeName}</span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {[methodLabel(dict, attempt.method), attempt.grind && t.grind.replace("{grind}", attempt.grind)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <BrewSummary attempt={attempt} dict={dict} size="lg" className="mt-2" />
        <div className="mt-4 flex gap-2">
          <Link
            href={`/u/${username}/attempts/${attempt.id}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-input border border-border px-4 text-sm font-medium text-ink"
          >
            {t.seeDetail}
          </Link>
          {canTry && (
            <TryRecipeButton
              username={username}
              attemptId={attempt.id}
              label={t.tryRecipeShort}
              showHint={false}
              className="flex-1"
            />
          )}
        </div>
      </div>
    </section>
  );
}
