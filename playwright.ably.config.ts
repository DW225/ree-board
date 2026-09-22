import { defineConfig } from "@playwright/test";
import local from "./playwright.local.config";

if (process.env.NEXT_PUBLIC_E2E_REALTIME_MODE !== "ably")
  throw new Error("Use pnpm test:e2e:ably with a dedicated test app");
export default defineConfig({
  ...local,
  testDir: "./tests/e2e/ably",
  timeout: 150_000,
});
