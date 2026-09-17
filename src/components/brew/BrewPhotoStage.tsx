"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { ATTEMPT_MEDIA_KINDS, type AttemptMediaKind } from "@/features/attempts/constants";
import type { BrewDraftPhoto } from "@/features/brew/draft";
import { useDictionary } from "@/components/i18n/LocaleProvider";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

// The photo step of the live brew: the coffee is made but not tasted yet, so
// this is the only moment it still looks the way it came out. There's no
// attempt row to hang the photos off yet, so each one is uploaded straight
// to Storage under the draft's own folder and only its path is kept in the
// draft — createAttemptAction turns those paths into attempt_media rows when
// the shot is finally saved.
export function BrewPhotoStage({
  draftId,
  photos,
  onChange,
}: {
  draftId: string;
  photos: BrewDraftPhoto[];
  onChange: (next: BrewDraftPhoto[]) => void;
}) {
  const dict = useDictionary();
  const [urls, setUrls] = useState<Record<string, string>>({});
  // Signing is per storage path and never changes for one, so each path is
  // asked for exactly once — including the ones that come back unsigned,
  // which otherwise re-request on every render.
  const requested = useRef(new Set<string>());

  // The paths themselves, not the array holding them: `photos` is rebuilt on
  // every parent render, and depending on its identity would re-run this on
  // renders that changed no photo at all.
  const photoPathsKey = photos.map((p) => p.storagePath).join("|");

  useEffect(() => {
    const missing = photoPathsKey.split("|").filter((p) => p && !requested.current.has(p));
    if (!missing.length) return;
    missing.forEach((p) => requested.current.add(p));

    // Deliberately not cancelled on cleanup: the paths are already marked as
    // requested, so an aborted response would never be asked for again and
    // the photo would stay blank. A late one is harmless — it merges into a
    // map keyed by path, and a signed URL for a photo that's since been
    // removed is simply never read.
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("coffee-photos")
        .createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);
      if (error || !data) return;
      setUrls((prev) => {
        const next = { ...prev };
        for (const item of data) {
          if (item.path && item.signedUrl) next[item.path] = item.signedUrl;
        }
        return next;
      });
    })();
  }, [photoPathsKey]);

  async function handleRemove(storagePath: string) {
    onChange(photos.filter((p) => p.storagePath !== storagePath));
    // Best-effort: a file left behind in Storage is invisible to the user
    // (nothing references it) and shouldn't block removing it from the draft.
    const supabase = createClient();
    const { error } = await supabase.storage.from("coffee-photos").remove([storagePath]);
    if (error) console.error("[brew-photo] failed to delete discarded photo:", error.message);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">{dict.brew.photoStepNote}</p>

      <PhotoUploader
        kinds={ATTEMPT_MEDIA_KINDS}
        kindLabels={dict.enums.attemptMediaKind}
        defaultKind="espresso"
        refreshOnUpload={false}
        buildPath={(userId) => `${userId}/attempts/drafts/${draftId}/${Date.now()}.jpg`}
        onRegister={async (kind: AttemptMediaKind, storagePath: string) => {
          onChange([...photos, { kind, storagePath }]);
          return { success: true };
        }}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <PhotoTile
              key={photo.storagePath}
              src={urls[photo.storagePath] ?? null}
              alt={dict.enums.attemptMediaKind[photo.kind]}
              onRemove={() => handleRemove(photo.storagePath)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
