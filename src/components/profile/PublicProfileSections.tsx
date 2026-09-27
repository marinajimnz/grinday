import { IconCafe, IconFavorita, IconMolinillo } from "@/components/icons/pencil-icons";
import { BrewSummary } from "@/components/attempt/BrewSummary";
import { StarRating } from "@/components/ui/StarRating";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import type { BrewMethod } from "@/features/equipment/constants";
import type { PublicAttempt, PublicCoffee, PublicEquipment } from "@/features/profile/publicQueries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";
import { formatRelativeDay } from "@/lib/i18n/format-date";
import { ExpandableSection } from "./ExpandableSection";

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

export function PublicCoffeesSection({ coffees, dict }: { coffees: PublicCoffee[]; dict: Dictionary }) {
  if (coffees.length === 0) return null;
  const t = dict.publicProfile;

  return (
    <ExpandableSection
      title={t.sectionCoffees}
      listClassName="grid grid-cols-2 gap-3"
      items={coffees.map((coffee, i) => (
        <li key={`${coffee.roaster}-${coffee.name}-${i}`} className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex h-20 items-center justify-center bg-canvas text-ink-muted">
            <IconCafe aria-hidden className="size-6" />
          </div>
          <div className="p-3">
            <p className="truncate text-xs text-ink-muted">{coffee.roaster}</p>
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

export function PublicAttemptsSection({
  attempts,
  dict,
  locale,
}: {
  attempts: PublicAttempt[];
  dict: Dictionary;
  locale: Locale;
}) {
  if (attempts.length === 0) return null;
  const t = dict.publicProfile;

  return (
    <ExpandableSection
      title={t.sectionAttempts}
      listClassName="space-y-2"
      items={attempts.map((attempt, i) => {
        const Icon = METHOD_ICONS[attempt.method as BrewMethod] ?? IconCafe;
        return (
          <li key={`${attempt.brewedOn}-${i}`} className="flex items-center gap-2.5 rounded-card border border-border bg-surface p-4">
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
              <p className="mt-0.5 truncate text-sm text-ink-muted">
                {attempt.coffeeName} · {attempt.roaster}
              </p>
              <BrewSummary attempt={attempt} dict={dict} className="mt-1" />
            </div>
          </li>
        );
      })}
    />
  );
}
