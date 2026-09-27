"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { setVisibilityAction } from "@/features/profile/actions";

// Shown on your own public profile: what you're looking at is what others
// see, and going private is right here. Once private this page would 404,
// so it hands you over to Settings, where the privacy card shows the state.
export function OwnProfileBanner() {
  const t = useDictionary().publicProfile;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink">{t.ownProfileBanner}</p>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await setVisibilityAction({ visibility: "private" });
              if (!result.success) {
                setError(result.message);
                return;
              }
              router.push("/settings");
            });
          }}
        >
          <Lock aria-hidden className="size-4" />
          <LoadingLabel loading={isPending}>{t.makePrivate}</LoadingLabel>
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
