import { NewCoffeeForm } from "@/components/coffee/NewCoffeeForm";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function NewCoffeePage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.coffees.newCoffeeTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.coffees.newCoffeeSubtitle}</p>
      <div className="mt-8">
        <NewCoffeeForm />
      </div>
    </div>
  );
}
