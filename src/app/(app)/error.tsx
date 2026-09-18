"use client";

import { useEffect } from "react";
import { IconCafe } from "@/components/icons/pencil-icons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// Every query behind these pages throws on a Supabase error, and without a
// boundary one failed request replaced the whole app with Next's default
// error screen — no nav, no way back, in the app's own typeface nowhere to
// be seen. This keeps the shell and offers the one action that helps.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDictionary();

  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <EmptyState
        icon={IconCafe}
        title={dict.errors.title}
        description={dict.errors.description}
        action={
          <Button type="button" onClick={reset} className="mt-2">
            {dict.common.retry}
          </Button>
        }
      />
    </div>
  );
}
