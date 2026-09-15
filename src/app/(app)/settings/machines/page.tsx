import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getUserBrewEquipment, getUserGrinders } from "@/features/equipment/queries";
import { GrinderCard } from "@/components/equipment/GrinderCard";
import { MethodsCard } from "@/components/equipment/MethodsCard";

export default async function MachinesSettingsPage() {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());

  const [grinders, equipment] = await Promise.all([
    getUserGrinders(supabase),
    getUserBrewEquipment(supabase),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-4xl text-ink">{dict.settings.machinesTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.settings.machinesSubtitle}</p>

      <div className="mt-8 space-y-6">
        <GrinderCard grinders={grinders} />
        <MethodsCard equipment={equipment} />
      </div>
    </div>
  );
}
