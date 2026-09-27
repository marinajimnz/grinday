import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests against the real linked Supabase database (see
// tests/integration/helpers/db.ts). Kept out of `test:unit` so the unit
// suite stays offline and fast; each file shares one connection, so files
// run one after another rather than opening a pool per worker.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
