"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SettingsAccordionCard } from "@/components/settings/SettingsAccordionCard";
import { IconFavorita, IconMaquinas } from "@/components/icons/pencil-icons";
import { BREW_METHODS } from "@/features/equipment/constants";
import { removeBrewEquipmentAction, setDefaultBrewEquipmentAction } from "@/features/equipment/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";

type Equipment = { id: string; method: string; model_name: string; is_default: boolean };

export function MethodsCard({ equipment }: { equipment: Equipment[] }) {
  const dict = useDictionary();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const grouped = BREW_METHODS.map((method) => ({
    method,
    items: equipment.filter((e) => e.method === method),
  })).filter((g) => g.items.length > 0);

  const addButton = <Button href="/settings/machines/new">{dict.equipment.addNewMachine}</Button>;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm font-medium text-ink">{dict.equipment.methodsCardTitle}</p>

      <div className="mt-3">
        {grouped.length === 0 ? (
          <EmptyState
            icon={IconMaquinas}
            title={dict.equipment.methodsEmptyTitle}
            description={dict.equipment.methodsEmptyDescription}
            action={addButton}
          />
        ) : (
          <div className="space-y-3">
            {grouped.map(({ method, items }) => (
              <SettingsAccordionCard
                key={method}
                title={`${dict.equipment.methodLabels[method]} (${items.length})`}
              >
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-input bg-canvas px-3 py-2"
                    >
                      <span className="text-sm text-ink">{item.model_name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending || item.is_default}
                          aria-label={item.is_default ? dict.equipment.default : dict.equipment.setDefault}
                          title={item.is_default ? dict.equipment.default : dict.equipment.setDefault}
                          onClick={() =>
                            startTransition(async () => {
                              await setDefaultBrewEquipmentAction({ equipmentId: item.id });
                              router.refresh();
                            })
                          }
                          className="text-coffee"
                        >
                          <IconFavorita className={cn("size-4", !item.is_default && "fill-none")} />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          aria-label={`${dict.ui.remove} ${item.model_name}`}
                          onClick={() =>
                            startTransition(async () => {
                              await removeBrewEquipmentAction({ equipmentId: item.id });
                              router.refresh();
                            })
                          }
                          className="text-ink-muted hover:text-ink"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </SettingsAccordionCard>
            ))}
            <div>{addButton}</div>
          </div>
        )}
      </div>
    </div>
  );
}
