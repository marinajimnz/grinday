"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { useDictionary } from "@/components/i18n/LocaleProvider";

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
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();

  if (!media.length) {
    return <p className="text-sm text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {media.map((item) =>
        item.url ? (
          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-input bg-canvas">
            <Image
              src={item.url}
              alt={item.alt_text ?? labelForKind(item.kind)}
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
                  await onDelete(item.id);
                  router.refresh();
                })
              }
              aria-label={dict.ui.deletePhoto}
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
