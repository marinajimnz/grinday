"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// One photo in a grid, with the control that removes it.
//
// That control used to be revealed by group-hover alone, which a phone has
// no way to perform — so on a touch device every photo was permanent, in an
// app whose photos are taken on a phone. It's on screen from the start
// wherever there's no hover to reveal it, and stays a hover reveal where
// there is one. The button is drawn small so it doesn't sit on top of the
// coffee, and padded out to a 44px target so it can still be hit.
export function PhotoTile({
  src,
  alt,
  onRemove,
  disabled,
}: {
  src: string | null;
  alt: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const dict = useDictionary();

  return (
    <div className="group relative aspect-square overflow-hidden rounded-input bg-canvas">
      {src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover"
          unoptimized
        />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={dict.ui.deletePhoto}
        className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-ink/70 text-surface transition-opacity after:absolute after:-inset-1.5 after:content-[''] focus-visible:opacity-100 disabled:opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
