"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "attempts", label: "Intentos" },
  { key: "evolution", label: "Evolución" },
  { key: "bags", label: "Bolsas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CoffeeTabs({
  attemptsContent,
  evolutionContent,
  bagsContent,
}: {
  attemptsContent: React.ReactNode;
  evolutionContent: React.ReactNode;
  bagsContent: React.ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("attempts");

  const content: Record<TabKey, React.ReactNode> = {
    attempts: attemptsContent,
    evolution: evolutionContent,
    bags: bagsContent,
  };

  return (
    <div>
      <div role="tablist" aria-label="Secciones del café" className="flex gap-1 border-b border-border">
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
