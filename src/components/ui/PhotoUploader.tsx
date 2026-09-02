"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/media/compressImage";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function PhotoUploader<K extends string>({
  kinds,
  kindLabels,
  defaultKind,
  buildPath,
  onRegister,
}: {
  kinds: readonly K[];
  kindLabels: Record<K, string>;
  defaultKind: K;
  buildPath: (userId: string) => string;
  onRegister: (kind: K, storagePath: string) => Promise<{ success: boolean; message?: string }>;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<K>(defaultKind);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setIsUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(dict.ui.notAuthenticated);

      const blob = await compressImage(file);
      const path = buildPath(user.id);

      const { error: uploadError } = await supabase.storage
        .from("coffee-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const result = await onRegister(kind, path);
      if (!result.success) throw new Error(result.message);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.ui.uploadFailed);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as K)}
        className="min-h-11 rounded-input border border-border bg-surface px-3 text-sm text-ink"
        aria-label={dict.ui.photoType}
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {kindLabels[k]}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-4 text-sm font-medium text-ink disabled:opacity-60"
      >
        <ImagePlus aria-hidden className="size-4" />
        {isUploading ? dict.ui.uploading : dict.ui.addPhoto}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && (
        <p role="alert" className="w-full text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
