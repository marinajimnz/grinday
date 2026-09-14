import { IconMaquinas } from "@/components/icons/pencil-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicEquipment } from "@/features/profile/publicQueries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function ProfileEquipmentList({
  equipment,
  dict,
}: {
  equipment: PublicEquipment;
  dict: Dictionary;
}) {
  const isEmpty =
    equipment.machines.length === 0 &&
    equipment.grinders.length === 0 &&
    equipment.brewEquipment.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={IconMaquinas}
        title={dict.profile.noEquipmentTitle}
        description={dict.profile.noEquipmentDescription}
      />
    );
  }

  return (
    <div className="space-y-4">
      {equipment.machines.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {dict.settings.machinesTitle}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {equipment.machines.map((machine) => (
              <li key={machine.id}>
                {machine.nickname ||
                  [machine.machineModel?.brand, machine.machineModel?.model_name]
                    .filter(Boolean)
                    .join(" ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {equipment.grinders.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {dict.equipment.grinderCardTitle}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {equipment.grinders.map((grinder) => (
              <li key={grinder.id}>{grinder.model_name}</li>
            ))}
          </ul>
        </div>
      )}

      {equipment.brewEquipment.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {dict.equipment.methodsCardTitle}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {equipment.brewEquipment.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span>
                  {dict.equipment.methodLabels[item.method as keyof typeof dict.equipment.methodLabels] ??
                    item.method}{" "}
                  · {item.model_name}
                </span>
                {item.is_default && <span className="text-xs text-coffee">{dict.equipment.default}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
