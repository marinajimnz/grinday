"use client";

import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { registerCoffeeMediaAction, deleteCoffeeMediaAction } from "@/features/coffees/actions";
import { PACKAGE_MEDIA_KINDS, MEDIA_KIND_LABELS } from "@/features/coffees/constants";
import type { CoffeeMediaRow } from "@/features/coffees/queries";

// Thin client wrapper: a Server Component page can't pass closures like
// `onRegister`/`onDelete` as props (RSC only serializes data and Server
// Action references across that boundary) — so this component imports the
// actions itself and wires them into the shared, action-agnostic UI pieces.
export function BagMediaSection({
  bagId,
  media,
}: {
  bagId: string;
  media: (CoffeeMediaRow & { url: string | null })[];
}) {
  return (
    <>
      <PhotoUploader
        kinds={PACKAGE_MEDIA_KINDS}
        kindLabels={MEDIA_KIND_LABELS}
        defaultKind="package_front"
        buildPath={(userId) => `${userId}/${bagId}/${Date.now()}.jpg`}
        onRegister={(kind, storagePath) =>
          registerCoffeeMediaAction({ coffeeBagId: bagId, kind, storagePath })
        }
      />
      <div className="mt-4">
        <MediaGallery
          media={media}
          labelForKind={(kind) => MEDIA_KIND_LABELS[kind as keyof typeof MEDIA_KIND_LABELS] ?? "Foto"}
          onDelete={(mediaId) => deleteCoffeeMediaAction(mediaId, bagId)}
          emptyLabel="Sin fotos todavía."
        />
      </div>
    </>
  );
}
