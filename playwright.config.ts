import { defineConfig } from '@playwright/test';

const mock = process.env.E2E_MOCK === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  webServer: mock ? {
    command: 'node tests/e2e/mock/server.mjs',
    url: 'http://127.0.0.1:3100/board/mock',
    reuseExistingServer: false,
  } : undefined,
  use: {
    baseURL: mock ? 'http://127.0.0.1:3100' : process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    storageState: mock ? undefined : 'playwright/.auth/member.json',
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
