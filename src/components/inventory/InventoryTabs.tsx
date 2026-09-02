"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { useDictionary } from "@/components/i18n/LocaleProvider";

type TabKey = "active" | "finished" | "archived";

export function InventoryTabs({
  activeContent,
  finishedContent,
  archivedContent,
}: {
  activeContent: React.ReactNode;
  finishedContent: React.ReactNode;
  archivedContent: React.ReactNode;
}) {
  const dict = useDictionary();
  const [active, setActive] = useState<TabKey>("active");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "active", label: dict.inventoryPage.tabActive },
    { key: "finished", label: dict.inventoryPage.tabFinished },
    { key: "archived", label: dict.inventoryPage.tabArchived },
  ];

  const content: Record<TabKey, React.ReactNode> = {
    active: activeContent,
    finished: finishedContent,
    archived: archivedContent,
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={dict.inventoryPage.tabsAriaLabel}
        className="flex gap-1 border-b border-border"
      >
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
