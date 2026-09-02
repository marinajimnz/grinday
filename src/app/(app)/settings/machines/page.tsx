import { createClient } from "@/lib/supabase/server";
import { SelectMachineButton } from "./SelectMachineButton";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function MachinesSettingsPage() {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());

  const [{ data: models }, { data: userMachines }] = await Promise.all([
    supabase.from("machine_models").select("id, brand, model_name"),
    supabase.from("user_machines").select("machine_model_id, is_default"),
  ]);

  const defaultModelId = userMachines?.find((m) => m.is_default)
    ?.machine_model_id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.settings.machinesTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.settings.machinesSubtitle}</p>

      <ul className="mt-8 space-y-3">
        {models?.map((model) => (
          <li
            key={model.id}
            className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-5"
          >
            <div>
              <p className="text-sm text-ink-muted">{model.brand}</p>
              <p className="font-display text-lg text-ink">
                {model.model_name}
              </p>
            </div>
            <SelectMachineButton
              machineModelId={model.id}
              isDefault={model.id === defaultModelId}
            />
          </li>
        ))}
      </ul>

      {!models?.length && (
        <p className="mt-8 text-sm text-ink-muted">{dict.settings.noMachines}</p>
      )}
    </div>
  );
}
