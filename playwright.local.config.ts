import { defineConfig } from "@playwright/test";
import { validateLocalE2e } from "./lib/config/localE2e";

const run = validateLocalE2e();
if (!run)
  throw new Error("Use pnpm test:e2e:local to start an isolated local run");

export default defineConfig({
  testDir: "./tests/e2e/local",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: `${run.runDirectory}/test-results`,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${run.runDirectory}/report`, open: "never" }],
  ],
  use: {
    baseURL: run.appOrigin,
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: "UTC",
    serviceWorkers: "block",
    // Auth traces contain local session tokens. Keep them only in the ignored run directory.
    trace: "retain-on-failure",
  },
});
