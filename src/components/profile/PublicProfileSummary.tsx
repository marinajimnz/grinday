"use client";

import { Check, Lock } from "lucide-react";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// What a public profile shows and what it never shows — the same list
// wherever someone is asked to go public, so the answer is always informed.
export function PublicProfileSummary() {
  const t = useDictionary().publicProfile;

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium text-ink">{t.sharedTitle}</p>
        <ul className="mt-1.5 space-y-1 text-ink-muted">
          {[t.sharedCoffees, t.sharedEquipment, t.sharedAttempts].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-coffee" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-start gap-2 text-ink-muted">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
        <span>
          <span className="font-medium text-ink">{t.neverTitle}</span> {t.neverShared}
        </span>
      </p>
    </div>
  );
}
