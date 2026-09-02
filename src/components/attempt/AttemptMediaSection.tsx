"use client";

import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { registerAttemptMediaAction, deleteAttemptMediaAction } from "@/features/attempts/actions";
import { ATTEMPT_MEDIA_KINDS } from "@/features/attempts/constants";
import type { AttemptMediaRow } from "@/features/attempts/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// See BagMediaSection for why this thin client wrapper exists: a Server
// Component page can't pass action-calling closures as props across the
// RSC boundary.
export function AttemptMediaSection({
  attemptId,
  media,
}: {
  attemptId: string;
  media: (AttemptMediaRow & { url: string | null })[];
}) {
  const dict = useDictionary();

  return (
    <>
      <PhotoUploader
        kinds={ATTEMPT_MEDIA_KINDS}
        kindLabels={dict.enums.attemptMediaKind}
        defaultKind="espresso"
        buildPath={(userId) => `${userId}/attempts/${attemptId}/${Date.now()}.jpg`}
        onRegister={(kind, storagePath) =>
          registerAttemptMediaAction({ attemptId, kind, storagePath })
        }
      />
      <div className="mt-4">
        <MediaGallery
          media={media}
          labelForKind={(kind) =>
            dict.enums.attemptMediaKind[kind as (typeof ATTEMPT_MEDIA_KINDS)[number]] ?? dict.ui.photo
          }
          onDelete={(mediaId) => deleteAttemptMediaAction(mediaId, attemptId)}
          emptyLabel={dict.ui.noAttemptPhotosYet}
        />
      </div>
    </>
  );
}
