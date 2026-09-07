"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddBagForm } from "./AddBagForm";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function AddBagPanel({ coffeeId }: { coffeeId: string }) {
  const dict = useDictionary();
  const [adding, setAdding] = useState(false);

  if (adding) {
    return <AddBagForm coffeeId={coffeeId} onCancel={() => setAdding(false)} />;
  }

  return (
    <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
      <Plus aria-hidden className="size-4" />
      {dict.coffees.addBag}
    </Button>
  );
}
