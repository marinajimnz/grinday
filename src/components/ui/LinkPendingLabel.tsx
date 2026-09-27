"use client";

import { useLinkStatus } from "next/link";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { BeanSpinner } from "./BeanSpinner";

// A link's label that turns into the bean spinner while the page it leads
// to is still being fetched — for links to server-rendered pages that take
// a moment (the admin tabs), where nothing else would change until they
// arrive. The label keeps its space (only hidden), so nothing jumps.
export function LinkPendingLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  const dict = useDictionary();

  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <BeanSpinner className="size-4" />
          <span role="status" className="sr-only">
            {dict.common.loading}
          </span>
        </span>
      )}
    </span>
  );
}
