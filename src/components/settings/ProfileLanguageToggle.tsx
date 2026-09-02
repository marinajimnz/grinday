"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { updateLocaleAction } from "@/features/i18n/actions";
import type { Locale } from "@/lib/i18n/types";

export function ProfileLanguageToggle() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <LanguageToggle
      disabled={isPending}
      onChange={(locale: Locale) => {
        startTransition(async () => {
          await updateLocaleAction(locale);
          router.refresh();
        });
      }}
    />
  );
}
