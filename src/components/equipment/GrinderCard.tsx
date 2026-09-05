"use client";

import { useState, useTransition } from "react";
import { TagInput } from "@/components/ui/TagInput";
import { addGrinderAction, removeGrinderAction } from "@/features/equipment/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";

type Grinder = { id: string; model_name: string };

export function GrinderCard({ grinders }: { grinders: Grinder[] }) {
  const dict = useDictionary();
  const [items, setItems] = useState(grinders);
  const [, startTransition] = useTransition();

  function handleChange(next: string[]) {
    const currentNames = items.map((g) => g.model_name);

    if (next.length > currentNames.length) {
      const added = next.find((name) => !currentNames.includes(name));
      if (!added) return;
      const tempId = `temp-${Date.now()}`;
      setItems((prev) => [...prev, { id: tempId, model_name: added }]);
      startTransition(async () => {
        const result = await addGrinderAction({ modelName: added });
        setItems((prev) =>
          result.success
            ? prev.map((g) => (g.id === tempId ? { id: result.data.id, model_name: added } : g))
            : prev.filter((g) => g.id !== tempId),
        );
      });
      return;
    }

    const removedName = currentNames.find((name) => !next.includes(name));
    if (!removedName) return;
    const target = items.find((g) => g.model_name === removedName);
    if (!target) return;
    setItems((prev) => prev.filter((g) => g.id !== target.id));
    startTransition(async () => {
      await removeGrinderAction({ grinderId: target.id });
    });
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm font-medium text-ink">{dict.equipment.grinderCardTitle}</p>
      <div className="mt-3">
        <TagInput
          value={items.map((g) => g.model_name)}
          onChange={handleChange}
          placeholder={dict.equipment.grinderPlaceholder}
        />
      </div>
    </div>
  );
}
