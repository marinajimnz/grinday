import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest runs with `globals: false`, so Testing Library can't register its
// own auto-cleanup — without this, every render in a file stacks up in the
// same document and queries start finding duplicates across tests.
afterEach(cleanup);

// jsdom ships no matchMedia at all, so anything that asks the OS about
// reduced motion, dark mode or viewport width throws on render. Stand in a
// query that matches nothing — the CSS default, and what the components
// under test are meant to do when the user has expressed no preference.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
