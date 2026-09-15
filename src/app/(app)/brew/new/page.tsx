import { Coffee } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { listBrewableCoffees } from "@/features/attempts/queries";
import { getUserBrewEquipment } from "@/features/equipment/queries";
import { BREW_METHODS, type BrewMethod } from "@/features/equipment/constants";
import { NewBrewWizard } from "@/components/brew/NewBrewWizard";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconMaquinas } from "@/components/icons/pencil-icons";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function BrewNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const dict = getDictionary(await getLocale());

  const [coffees, equipment] = await Promise.all([
    listBrewableCoffees(supabase, user.id),
    getUserBrewEquipment(supabase, user.id),
  ]);

  const availableMethods: BrewMethod[] = BREW_METHODS.filter((method) =>
    equipment.some((e) => e.method === method),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-4xl text-ink">{dict.brew.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.brew.subtitle}</p>

      <div className="mt-8">
        {!availableMethods.length ? (
          <EmptyState
            icon={IconMaquinas}
            title={dict.brew.noEquipmentTitle}
            description={dict.brew.noEquipmentDescription}
            action={
              <Button href="/settings/machines/new" className="mt-2">
                {dict.equipment.addNewMachine}
              </Button>
            }
          />
        ) : !coffees.length ? (
          <EmptyState
            icon={Coffee}
            title={dict.brew.noCoffeeTitle}
            description={dict.brew.noCoffeeDescription}
          />
        ) : (
          <NewBrewWizard availableMethods={availableMethods} coffees={coffees} />
        )}
      </div>
    </div>
  );
}
