"use client";

import { createContext, useContext, useEffect, useState } from "react";

const BottomNavVisibilityContext = createContext<{
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
} | null>(null);

export function BottomNavVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <BottomNavVisibilityContext.Provider value={{ hidden, setHidden }}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

function useBottomNavVisibility() {
  const ctx = useContext(BottomNavVisibilityContext);
  if (!ctx) throw new Error("useBottomNavVisibility must be used within BottomNavVisibilityProvider");
  return ctx;
}

export function useAppShellBottomNavHidden() {
  return useBottomNavVisibility().hidden;
}

// Hides the mobile bottom nav for as long as the calling component is
// mounted with `hide` true — e.g. a full-screen step flow that wants the
// user's focus. Restores it automatically on unmount or when `hide` flips
// back to false.
export function useHideBottomNav(hide: boolean) {
  const { setHidden } = useBottomNavVisibility();
  useEffect(() => {
    if (!hide) return;
    setHidden(true);
    return () => setHidden(false);
  }, [hide, setHidden]);
}
