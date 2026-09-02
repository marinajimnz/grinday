import { Coffee } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listBrewableCoffees } from "@/features/attempts/queries";
import { BrewPicker } from "@/components/brew/BrewPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function BrewNewPage() {
  const supabase = await createClient();
  const coffees = await listBrewableCoffees(supabase);
  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.brew.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.brew.subtitle}</p>

      <div className="mt-8">
        {coffees.length ? (
          <BrewPicker coffees={coffees} />
        ) : (
          <EmptyState
            icon={Coffee}
            title={dict.brew.noCoffeeTitle}
            description={dict.brew.noCoffeeDescription}
          />
        )}
      </div>
    </div>
  );
}
