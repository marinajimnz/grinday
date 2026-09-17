import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateAttemptForm } from "@/components/attempt/CreateAttemptForm";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function NewAttemptPage({
  searchParams,
}: {
  searchParams: Promise<{ coffeeBagId?: string }>;
}) {
  const { coffeeBagId } = await searchParams;
  if (!coffeeBagId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const dict = getDictionary(await getLocale());

  const { data: bag } = await supabase
    .from("coffee_bags")
    .select("id, coffee:coffees(id, name, roaster)")
    .eq("id", coffeeBagId)
    .maybeSingle();
  if (!bag) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Link
        href={`/coffees/${bag.coffee.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {bag.coffee.roaster} · {bag.coffee.name}
      </Link>

      <h1 className="mt-4 font-display text-3xl text-ink">{dict.attempts.newTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.attempts.newSubtitle}</p>

      <div className="mt-8">
        <CreateAttemptForm coffeeBagId={coffeeBagId} />
      </div>
    </div>
  );
}
