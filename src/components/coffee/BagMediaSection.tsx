"use client";

import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { registerCoffeeMediaAction, deleteCoffeeMediaAction } from "@/features/coffees/actions";
import { PACKAGE_MEDIA_KINDS, type MEDIA_KINDS } from "@/features/coffees/constants";
import type { CoffeeMediaRow, SharedCoverPhoto } from "@/features/coffees/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// Thin client wrapper: a Server Component page can't pass closures like
// `onRegister`/`onDelete` as props (RSC only serializes data and Server
// Action references across that boundary) — so this component imports the
// actions itself and wires them into the shared, action-agnostic UI pieces.
export function BagMediaSection({
  bagId,
  media,
  sharedPhoto = null,
}: {
  bagId: string;
  media: (CoffeeMediaRow & { url: string | null })[];
  /** The coffee's front photo from another bag, when this one has none. */
  sharedPhoto?: SharedCoverPhoto | null;
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
      {sharedPhoto && (
        // Read-only here: it belongs to the other bag, and removing it from
        // this one would take it off every bag of the coffee. Uploading a
        // front photo for this bag replaces it.
        <figure className="mt-4">
          <div className="w-1/2 sm:w-1/3">
            <PhotoTile
              src={sharedPhoto.url}
              alt={sharedPhoto.alt ?? dict.enums.mediaKind.package_front}
            />
          </div>
          <figcaption className="mt-1.5 text-xs text-ink-muted">
            {dict.ui.sharedCoffeePhoto}
          </figcaption>
        </figure>
      )}
      {(media.length > 0 || !sharedPhoto) && (
        <div className="mt-4">
          <MediaGallery
            media={media}
            labelForKind={(kind) => dict.enums.mediaKind[kind as (typeof MEDIA_KINDS)[number]] ?? dict.ui.photo}
            onDelete={(mediaId) => deleteCoffeeMediaAction(mediaId, bagId)}
            emptyLabel={dict.ui.noPhotosYet}
          />
        </div>
      )}
    </>
  );
}
