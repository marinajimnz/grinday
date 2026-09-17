import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest runs with `globals: false`, so Testing Library can't register its
// own auto-cleanup — without this, every render in a file stacks up in the
// same document and queries start finding duplicates across tests.
afterEach(cleanup);
