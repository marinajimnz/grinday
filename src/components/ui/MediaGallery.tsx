"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoTile } from "@/components/ui/PhotoTile";

type MediaItem = {
  id: string;
  url: string | null;
  alt_text: string | null;
  kind: string;
};

export function MediaGallery<T extends MediaItem>({
  media,
  labelForKind,
  onDelete,
  emptyLabel,
}: {
  media: T[];
  labelForKind: (kind: string) => string;
  onDelete: (mediaId: string) => Promise<unknown>;
  emptyLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!media.length) {
    return <p className="text-sm text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {media.map((item) =>
        item.url ? (
          <PhotoTile
            key={item.id}
            src={item.url}
            alt={item.alt_text ?? labelForKind(item.kind)}
            disabled={isPending}
            onRemove={() =>
              startTransition(async () => {
                await onDelete(item.id);
                router.refresh();
              })
            }
          />
        ) : null,
      )}
    </div>
  );
}
