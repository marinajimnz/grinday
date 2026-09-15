import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Generous, but the suite runs against a production build now (see
  // webServer) so nothing should actually need it — it's headroom for a slow
  // machine, not for a server still compiling the page under test.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-390",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Built and served for real, not `next dev`. Under dev, Next compiles each
  // route lazily on its first request and hydrates far more slowly, and the
  // suite paid for both: routes timing out mid-compile, the server dropping
  // requests outright under parallel load (net::ERR_ABORTED, "destination
  // stream closed early"), and clicks landing on markup that looked
  // interactive but had no React handler attached yet. The same 34 tests went
  // from 12 failures in 6.7 min against `next dev` to green in 42 s here, on
  // an 18-second build.
  //
  // reuseExistingServer means a `next dev` you already have running is used
  // instead — convenient while writing a spec, but that's the flaky
  // configuration, so judge a run by a clean one.
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
