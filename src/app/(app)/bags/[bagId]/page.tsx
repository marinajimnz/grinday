import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { countCupsByBag, getBagDetail } from "@/features/coffees/queries";
import { BagDetailPanel } from "@/components/coffee/BagDetailPanel";
import { BagMediaSection } from "@/components/coffee/BagMediaSection";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.pageTitles.bag);

export default async function BagDetailPage({
  params,
}: {
  params: Promise<{ bagId: string }>;
}) {
  const { bagId } = await params;
  const supabase = await createClient();
  const result = await getBagDetail(supabase, bagId);

  if (!result) notFound();
  const { bag, media, sharedPhoto } = result;
  const dict = getDictionary(await getLocale());
  const cups = (await countCupsByBag(supabase, [bag.id])).get(bag.id) ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Link
        href={`/coffees/${bag.coffee.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {bag.coffee.roaster} · {bag.coffee.name}
      </Link>

      <div className="mt-4">
        <BagDetailPanel bag={bag} cups={cups} />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl text-ink">{dict.inventoryPage.gallery}</h2>
        <div className="mt-3">
          <BagMediaSection bagId={bag.id} media={media} sharedPhoto={sharedPhoto} />
        </div>
      </div>
    </div>
  );
}
