import { defineConfig } from "@playwright/test";
import local from "./playwright.local.config";

if (process.env.E2E_CAPTCHA_MODE !== "test-keys")
  throw new Error("Use pnpm test:e2e:captcha");
export default defineConfig({
  ...local,
  testDir: "./tests/e2e/captcha",
  timeout: 120_000,
});
