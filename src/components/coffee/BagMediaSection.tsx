"use client";

import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { registerCoffeeMediaAction, deleteCoffeeMediaAction } from "@/features/coffees/actions";
import { PACKAGE_MEDIA_KINDS, type MEDIA_KINDS } from "@/features/coffees/constants";
import type { CoffeeMediaRow } from "@/features/coffees/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

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
  const dict = useDictionary();

  return (
    <>
      <PhotoUploader
        kinds={PACKAGE_MEDIA_KINDS}
        kindLabels={dict.enums.mediaKind}
        defaultKind="package_front"
        buildPath={(userId) => `${userId}/${bagId}/${Date.now()}.jpg`}
        onRegister={(kind, storagePath) =>
          registerCoffeeMediaAction({ coffeeBagId: bagId, kind, storagePath })
        }
      />
      <div className="mt-4">
        <MediaGallery
          media={media}
          labelForKind={(kind) => dict.enums.mediaKind[kind as (typeof MEDIA_KINDS)[number]] ?? dict.ui.photo}
          onDelete={(mediaId) => deleteCoffeeMediaAction(mediaId, bagId)}
          emptyLabel={dict.ui.noPhotosYet}
        />
      </div>
    </>
  );
}
