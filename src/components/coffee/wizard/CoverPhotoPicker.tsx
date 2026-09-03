"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { IconCafe } from "@/components/icons/pencil-icons";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// No `capture` attribute on purpose: a plain accept="image/*" file input is
// what makes mobile browsers offer "Take Photo" *and* "Photo Library" in the
// same picker — adding `capture` would force the camera and remove the
// gallery option.
export function CoverPhotoPicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const dict = useDictionary();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // Cleanup only — the URL itself is derived straight from `file` above, not
  // stored as separate state, so this effect never needs to call setState.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">{dict.coffees.coverPhotoHint}</p>

      <div className="relative flex aspect-[4/3] w-full max-w-[240px] items-center justify-center overflow-hidden rounded-card border border-border bg-canvas">
        {previewUrl ? (
          <Image src={previewUrl} alt="" fill sizes="240px" className="object-cover" unoptimized />
        ) : (
          <IconCafe aria-hidden className="size-10 text-coffee" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-4 text-sm font-medium text-ink"
        >
          <ImagePlus aria-hidden className="size-4" />
          {file ? dict.coffees.changePhoto : dict.ui.addPhoto}
        </button>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-11 rounded-input border border-border px-4 text-sm font-medium text-ink"
          >
            {dict.ui.remove}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onChange(selected);
          e.target.value = "";
        }}
      />
    </div>
  );
}
