"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/media/compressImage";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { noZoomTextClassName } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function PhotoUploader<K extends string>({
  kinds,
  kindLabels,
  defaultKind,
  buildPath,
  onRegister,
  // The brew flow's photo step keeps its uploaded photos in the local draft
  // rather than in a server-rendered list, so there's nothing on the server
  // to re-fetch after an upload — only callers backed by a Server Component
  // gallery need the refresh.
  refreshOnUpload = true,
}: {
  kinds: readonly K[];
  kindLabels: Record<K, string>;
  defaultKind: K;
  buildPath: (userId: string) => string;
  onRegister: (kind: K, storagePath: string) => Promise<{ success: boolean; message?: string }>;
  refreshOnUpload?: boolean;
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

      if (refreshOnUpload) router.refresh();
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
        className={cn(
          "min-h-11 rounded-input border border-border bg-surface px-3 text-ink",
          noZoomTextClassName,
        )}
        aria-label={dict.ui.photoType}
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {kindLabels[k]}
          </option>
        ))}
      </select>

      <Button variant="secondary" disabled={isUploading} onClick={() => inputRef.current?.click()}>
        <ImagePlus aria-hidden className="size-4" />
        {isUploading ? dict.ui.uploading : dict.ui.addPhoto}
      </Button>
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
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
