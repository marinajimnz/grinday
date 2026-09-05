import { NewEquipmentWizard } from "@/components/equipment/NewEquipmentWizard";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function NewEquipmentPage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-4xl text-ink">{dict.equipment.newEquipmentTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.equipment.newEquipmentSubtitle}</p>
      <div className="mt-8">
        <NewEquipmentWizard />
      </div>
    </div>
  );
}
