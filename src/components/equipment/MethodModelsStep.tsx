"use client";

import { TagInput } from "@/components/ui/TagInput";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import type { BrewMethod } from "@/features/equipment/constants";

export function MethodModelsStep({
  methods,
  modelsByMethod,
  onChange,
}: {
  methods: BrewMethod[];
  modelsByMethod: Record<string, string[]>;
  onChange: (method: BrewMethod, next: string[]) => void;
}) {
  const dict = useDictionary();

  return (
    <div>
      <h2 className="font-display text-4xl text-ink">{dict.equipment.stepModelsTitle}</h2>
      <p className="mt-1 text-sm text-ink-muted">{dict.equipment.stepModelsSubtitle}</p>

      <div className="mt-6 space-y-5">
        {methods.map((method) => (
          <div key={method}>
            <label className="text-sm font-medium text-ink" htmlFor={`method-${method}-input`}>
              {dict.equipment.methodLabels[method]}
            </label>
            <div className="mt-2">
              <TagInput
                id={`method-${method}-input`}
                value={modelsByMethod[method] ?? []}
                onChange={(next) => onChange(method, next)}
                placeholder={dict.equipment.modelsPlaceholder}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
