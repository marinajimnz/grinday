"use client";

import { useEffect, useRef } from "react";

// For a row of tabs that scrolls sideways on a phone: keeps the current
// one (aria-current="page") in view, instead of leaving it off-screen after
// choosing one near the end.
export function ScrollActiveIntoView({ activeKey }: { activeKey: string }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const active = marker.current?.parentElement?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  return <span ref={marker} hidden />;
}
