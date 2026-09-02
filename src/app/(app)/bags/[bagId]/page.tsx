import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBagDetail } from "@/features/coffees/queries";
import { BagDetailPanel } from "@/components/coffee/BagDetailPanel";
import { BagMediaSection } from "@/components/coffee/BagMediaSection";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function BagDetailPage({
  params,
}: {
  params: Promise<{ bagId: string }>;
}) {
  const { bagId } = await params;
  const supabase = await createClient();
  const result = await getBagDetail(supabase, bagId);

  if (!result) notFound();
  const { bag, media } = result;
  const dict = getDictionary(await getLocale());

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
        <BagDetailPanel bag={bag} />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl text-ink">{dict.inventoryPage.gallery}</h2>
        <div className="mt-3">
          <BagMediaSection bagId={bag.id} media={media} />
        </div>
      </div>
    </div>
  );
}
