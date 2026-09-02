"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddBagForm } from "./AddBagForm";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function AddBagPanel({ coffeeId }: { coffeeId: string }) {
  const dict = useDictionary();
  const [adding, setAdding] = useState(false);

  if (adding) {
    return <AddBagForm coffeeId={coffeeId} onCancel={() => setAdding(false)} />;
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-4 text-sm font-medium text-ink"
    >
      <Plus aria-hidden className="size-4" />
      {dict.coffees.addBag}
    </button>
  );
}
