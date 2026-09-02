import { Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listActiveBags, listFinishedBags } from "@/features/inventory/queries";
import { BagInventoryRow } from "@/components/inventory/BagInventoryRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function InventoryPage() {
  const supabase = await createClient();
  const [activeBags, finishedBags] = await Promise.all([
    listActiveBags(supabase),
    listFinishedBags(supabase),
  ]);
  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.inventoryPage.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.inventoryPage.subtitle}</p>

      <div className="mt-8 space-y-3">
        {activeBags.length ? (
          activeBags.map((bag) => <BagInventoryRow key={bag.id} bag={bag} dict={dict} />)
        ) : (
          <EmptyState
            icon={Archive}
            title={dict.inventoryPage.noActiveTitle}
            description={dict.inventoryPage.noActiveDescription}
          />
        )}
      </div>

      {finishedBags.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg text-ink">{dict.inventoryPage.finished}</h2>
          <div className="mt-3 space-y-3 opacity-70">
            {finishedBags.map((bag) => (
              <BagInventoryRow key={bag.id} bag={bag} dict={dict} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
