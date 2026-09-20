"use client";

import { StarRatingInput } from "@/components/ui/StarRating";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function TasteScale({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  id: string;
}) {
  const dict = useDictionary();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-ink-muted underline"
          >
            {dict.common.clear}
          </button>
        )}
      </div>
      <StarRatingInput id={id} label={label} value={value} onChange={onChange} />
    </div>
  );
}
