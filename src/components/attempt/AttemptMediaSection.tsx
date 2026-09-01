"use client";

import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { registerAttemptMediaAction, deleteAttemptMediaAction } from "@/features/attempts/actions";
import { ATTEMPT_MEDIA_KINDS, ATTEMPT_MEDIA_KIND_LABELS } from "@/features/attempts/constants";
import type { AttemptMediaRow } from "@/features/attempts/queries";

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
  return (
    <>
      <PhotoUploader
        kinds={ATTEMPT_MEDIA_KINDS}
        kindLabels={ATTEMPT_MEDIA_KIND_LABELS}
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
            ATTEMPT_MEDIA_KIND_LABELS[kind as keyof typeof ATTEMPT_MEDIA_KIND_LABELS] ?? "Foto"
          }
          onDelete={(mediaId) => deleteAttemptMediaAction(mediaId, attemptId)}
          emptyLabel="Todavía no hay fotos de este intento."
        />
      </div>
    </>
  );
}
