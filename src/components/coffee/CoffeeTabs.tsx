"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { useDictionary } from "@/components/i18n/LocaleProvider";

type TabKey = "attempts" | "evolution" | "bags";

export function CoffeeTabs({
  attemptsContent,
  evolutionContent,
  bagsContent,
}: {
  attemptsContent: React.ReactNode;
  evolutionContent: React.ReactNode;
  bagsContent: React.ReactNode;
}) {
  const dict = useDictionary();
  const [active, setActive] = useState<TabKey>("attempts");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "attempts", label: dict.coffees.tabAttempts },
    { key: "evolution", label: dict.coffees.tabEvolution },
    { key: "bags", label: dict.coffees.tabBags },
  ];

  const content: Record<TabKey, React.ReactNode> = {
    attempts: attemptsContent,
    evolution: evolutionContent,
    bags: bagsContent,
  };

  return (
    <div>
      <div role="tablist" aria-label={dict.coffees.tabsAriaLabel} className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "min-h-11 border-b-2 px-3 text-sm font-medium",
              active === tab.key
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-5">
        {content[active]}
      </div>
    </div>
  );
}
