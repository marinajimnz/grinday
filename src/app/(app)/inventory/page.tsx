import { createClient } from "@/lib/supabase/server";
import { listActiveBags, listArchivedBags, listFinishedBags } from "@/features/inventory/queries";
import { BagInventoryRow } from "@/components/inventory/BagInventoryRow";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconArchivar } from "@/components/icons/pencil-icons";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function InventoryPage() {
  const supabase = await createClient();
  const [activeBags, finishedBags, archivedBags] = await Promise.all([
    listActiveBags(supabase),
    listFinishedBags(supabase),
    listArchivedBags(supabase),
  ]);
  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.inventoryPage.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.inventoryPage.subtitle}</p>

      <div className="mt-8">
        <InventoryTabs
          activeContent={
            activeBags.length ? (
              <div className="space-y-3">
                {activeBags.map((bag) => (
                  <BagInventoryRow key={bag.id} bag={bag} dict={dict} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={IconArchivar}
                title={dict.inventoryPage.noActiveTitle}
                description={dict.inventoryPage.noActiveDescription}
              />
            )
          }
          finishedContent={
            finishedBags.length ? (
              <div className="space-y-3">
                {finishedBags.map((bag) => (
                  <BagInventoryRow key={bag.id} bag={bag} dict={dict} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={IconArchivar}
                title={dict.inventoryPage.noFinishedTitle}
                description={dict.inventoryPage.noFinishedDescription}
              />
            )
          }
          archivedContent={
            archivedBags.length ? (
              <div className="space-y-3">
                {archivedBags.map((bag) => (
                  <BagInventoryRow key={bag.id} bag={bag} dict={dict} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={IconArchivar}
                title={dict.inventoryPage.noArchivedTitle}
                description={dict.inventoryPage.noArchivedDescription}
              />
            )
          }
        />
      </div>
    </div>
  );
}
