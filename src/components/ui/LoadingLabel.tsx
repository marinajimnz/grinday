"use client";

import { useDictionary } from "@/components/i18n/LocaleProvider";
import { BeanSpinner } from "./BeanSpinner";

// Drop-in for a button's label: `{isPending ? dict.common.saving : "Save"}`
// becomes `<LoadingLabel loading={isPending}>Save</LoadingLabel>`, adding
// the spinning bean next to the pending text everywhere a form saves.
export function LoadingLabel({
  loading,
  loadingText,
  children,
}: {
  loading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}) {
  const dict = useDictionary();

  if (!loading) return <>{children}</>;

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <BeanSpinner className="size-4" />
      {loadingText ?? dict.common.saving}
    </span>
  );
}
