import { type ROAST_LEVELS } from "@/features/coffees/constants";
import type { CoffeeRow } from "@/features/coffees/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export type CoffeeFactsCoffee = Pick<
  CoffeeRow,
  | "country"
  | "region"
  | "farm"
  | "producer"
  | "process"
  | "roast_level"
  | "altitude_min_m"
  | "altitude_max_m"
  | "varieties"
  | "tasting_notes"
>;

// Where a coffee is from, how it was processed and roasted, and what it
// tastes of — on your own coffee page and on someone else's public one.
// Takes `dict` rather than calling useDictionary: one caller is a Client
// Component, the other a Server Component.
export function CoffeeFacts({ coffee, dict }: { coffee: CoffeeFactsCoffee; dict: Dictionary }) {
  return (
    <>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {coffee.country && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.country}</dt>
            <dd className="text-ink">{coffee.country}</dd>
          </div>
        )}
        {coffee.region && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.region}</dt>
            <dd className="text-ink">{coffee.region}</dd>
          </div>
        )}
        {coffee.farm && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.farm}</dt>
            <dd className="text-ink">{coffee.farm}</dd>
          </div>
        )}
        {coffee.producer && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.producer}</dt>
            <dd className="text-ink">{coffee.producer}</dd>
          </div>
        )}
        {coffee.process && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.process}</dt>
            <dd className="text-ink">{coffee.process}</dd>
          </div>
        )}
        {coffee.roast_level && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.roastLevel}</dt>
            <dd className="text-ink">
              {dict.enums.roastLevel[coffee.roast_level as (typeof ROAST_LEVELS)[number]] ??
                coffee.roast_level}
            </dd>
          </div>
        )}
        {(coffee.altitude_min_m || coffee.altitude_max_m) && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.altitude}</dt>
            <dd className="text-ink">
              {coffee.altitude_min_m ?? "?"}–{coffee.altitude_max_m ?? "?"} m
            </dd>
          </div>
        )}
      </dl>

      {coffee.varieties.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-ink-muted">{dict.coffees.varieties}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffee.varieties.map((v) => (
              <span key={v} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {coffee.tasting_notes.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-ink-muted">{dict.coffees.tastingNotes}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffee.tasting_notes.map((n) => (
              <span key={n} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
