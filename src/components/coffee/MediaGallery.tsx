"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { MEDIA_KIND_LABELS } from "@/features/coffees/constants";
import { deleteCoffeeMediaAction } from "@/features/coffees/actions";
import type { CoffeeMediaRow } from "@/features/coffees/queries";

export function MediaGallery({
  media,
  coffeeBagId,
}: {
  media: (CoffeeMediaRow & { url: string | null })[];
  coffeeBagId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!media.length) {
    return <p className="text-sm text-ink-muted">Sin fotos todavía.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {media.map((item) =>
        item.url ? (
          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-input bg-canvas">
            <Image
              src={item.url}
              alt={
                item.alt_text ??
                MEDIA_KIND_LABELS[item.kind as keyof typeof MEDIA_KIND_LABELS] ??
                "Foto del paquete"
              }
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteCoffeeMediaAction(item.id, coffeeBagId);
                  router.refresh();
                })
              }
              aria-label="Eliminar foto"
              className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink/70 text-surface opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : null,
      )}
    </div>
  );
}
