"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Guards against leaving the current page while `active` is true, by asking
// for confirmation first. The App Router has no built-in "confirm before
// navigating" hook, so this covers the two ways a user can actually leave a
// route in this app: clicking an internal link (bottom nav, sidebar nav —
// intercepted in the capture phase, before Next's own Link handler runs)
// and closing/refreshing the tab (the browser's own native dialog, which
// can't be restyled but is still a real warning). The browser back
// button/gesture isn't covered — reliably guarding it means manipulating
// history depth, which risks breaking normal back-navigation once the user
// does leave, for a case (this app has no in-page back button either) that
// isn't its main exit path.
export function useConfirmBeforeLeaving(active: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setPendingHref(url.pathname + url.search);
    }

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active]);

  return {
    open: pendingHref !== null,
    confirmLeave: () => {
      if (!pendingHref) return;
      const href = pendingHref;
      setPendingHref(null);
      router.push(href);
    },
    cancelLeave: () => setPendingHref(null),
  };
}
