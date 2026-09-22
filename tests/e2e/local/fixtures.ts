import { test as base, expect } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";
import { validateLocalE2e } from "../../../lib/config/localE2e";

const manifest = validateLocalE2e();
if (!manifest) throw new Error("Local E2E configuration is required");
export const run = manifest;

interface LocalFixtures {
  sessions: () => Promise<BrowserContext>;
}

export const test = base.extend<LocalFixtures>({
  sessions: async ({ browser }, provide) => {
    const contexts: BrowserContext[] = [];
    const unexpected = new Set<string>();
    const allowed = new Set([run.appOrigin, run.supabaseOrigin]);
    if (process.env.E2E_CAPTCHA_MODE === "test-keys")
      allowed.add("https://challenges.cloudflare.com");
    const ablyHost = (url: URL) =>
      process.env.NEXT_PUBLIC_E2E_REALTIME_MODE === "ably" &&
      /^(?:realtime\.ably\.io|rest\.ably\.io|main\.realtime\.ably\.net|[a-e]\.ably-realtime\.com|main\.[a-e]\.fallback\.ably-realtime\.com)$/.test(
        url.hostname
      ) &&
      !url.port &&
      ["https:", "wss:"].includes(url.protocol);
    try {
      await provide(async () => {
        const context = await browser.newContext({
          baseURL: run.appOrigin,
          serviceWorkers: "block",
        });
        contexts.push(context);
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (allowed.has(url.origin) || ablyHost(url)) return route.continue();
          unexpected.add(url.origin);
          return route.abort("blockedbyclient");
        });
        await context.routeWebSocket("**/*", (socket) => {
          if (ablyHost(new URL(socket.url()))) {
            socket.connectToServer();
            return;
          }
          unexpected.add(new URL(socket.url()).origin);
          socket.close();
        });
        return context;
      });
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
      expect(
        [...unexpected],
        "Browser requests must use only this run's app and Auth"
      ).toEqual([]);
    }
  },
  page: async ({ sessions }, provide) => {
    const context = await sessions();
    await provide(await context.newPage());
  },
});
export { expect };
