"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { buttonClassName } from "@/components/ui/Button";
import { removeFavouriteAction } from "@/features/profile/favouriteActions";

// Removes a saved profile that's no longer available — it has no username
// left to go by, only its bookmark.
export function RemoveFavouriteButton({ bookmarkId }: { bookmarkId: string }) {
  const t = useDictionary().favorites;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={isPending}
        className={buttonClassName("secondary")}
        onClick={() =>
          startTransition(async () => {
            const result = await removeFavouriteAction(bookmarkId);
            if (!result.success) {
              setError(result.message);
              return;
            }
            router.refresh();
          })
        }
      >
        <LoadingLabel loading={isPending}>{t.remove}</LoadingLabel>
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
