import { localE2eManifest, validateLocalE2e } from "./localE2e";

function localEnv(): NodeJS.ProcessEnv {
  const manifest = localE2eManifest("run-one", 0);
  return {
    APP_ENV: "local-e2e",
    NODE_ENV: "production",
    E2E_MANIFEST: JSON.stringify(manifest),
    NEXT_PUBLIC_E2E_RUN_ID: manifest.runId,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:35001",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-public",
    SUPABASE_SECRET_KEY: "local-admin",
    TURSO_DATABASE_URL: "http://127.0.0.1:35002",
    E2E_RELAY_TOKEN: "local-relay",
    E2E_CAPTCHA_MODE: "fixture",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "local-e2e",
  };
}

describe("local E2E service boundary", () => {
  it.each(["development", "production"])(
    "accepts the owned local targets in %s",
    (mode) => {
      const env = { ...localEnv(), NODE_ENV: mode };
      expect(validateLocalE2e(env)?.buildDirectory).toBe(".e2e/run-one/next");
    }
  );

  it.each([
    ["NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"],
    ["TURSO_DATABASE_URL", "libsql://example.turso.io"],
    ["NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:35021"],
    ["NEXT_PUBLIC_SUPABASE_URL", "http://user@127.0.0.1:35001"],
    ["NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:35001/other"],
    ["ABLY_API_KEY", "live-sentinel"],
    ["TURSO_AUTH_TOKEN", "live-sentinel"],
    ["SENTRY_TOKEN", "live-sentinel"],
    ["VERCEL", "1"],
    ["NEXT_PUBLIC_E2E_RUN_ID", "another-run"],
    ["E2E_CAPTCHA_MODE", "unknown"],
    ["SUPABASE_SECRET_KEY", ""],
  ])("rejects an unsafe or missing %s", (key, value) => {
    expect(() => validateLocalE2e({ ...localEnv(), [key]: value })).toThrow();
  });

  it("rejects a manifest that escapes the owned run directory", () => {
    const env = localEnv();
    env.E2E_MANIFEST = JSON.stringify({
      ...localE2eManifest("run-one", 0),
      buildDirectory: "../other",
    });
    expect(() => validateLocalE2e(env)).toThrow();
  });

  it("rejects local public flags when the server is not in local mode", () => {
    expect(() =>
      validateLocalE2e({ NEXT_PUBLIC_E2E_RUN_ID: "run-one" })
    ).toThrow();
  });

  it("leaves ordinary app configuration unchanged", () => {
    expect(validateLocalE2e({ NODE_ENV: "production" })).toBeUndefined();
  });

  it.each([-1, 500, 0.5])("rejects invalid slot %s", (slot) => {
    expect(() => localE2eManifest("run-one", slot)).toThrow();
  });
});

it("builds local mode without the Sentry tunnel or Vercel toolbar", () => {
  const original = process.env;
  process.env = localEnv();
  jest.resetModules();
  jest.doMock("@sentry/nextjs/config", () => ({
    withSentryConfig: () => {
      throw new Error("Sentry wrapper must stay disabled");
    },
  }));
  jest.doMock("@vercel/toolbar/plugins/next", () => () => {
    throw new Error("Toolbar wrapper must stay disabled");
  });
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require("../../next.config.js") as {
      distDir: string;
      rewrites?: unknown;
    };
    expect(config.distDir).toBe(".e2e/run-one/next");
    expect(config.rewrites).toBeUndefined();
  } finally {
    process.env = original;
    jest.resetModules();
    jest.dontMock("@sentry/nextjs/config");
    jest.dontMock("@vercel/toolbar/plugins/next");
  }
});

it("accepts only the generated service DNS origins in the isolated runtime", () => {
  const manifest = localE2eManifest("run-one", 0, "container");
  const env = {
    ...localEnv(),
    E2E_MANIFEST: JSON.stringify(manifest),
    NEXT_PUBLIC_SUPABASE_URL: manifest.supabaseOrigin,
    TURSO_DATABASE_URL: manifest.libsqlOrigin,
  };
  expect(validateLocalE2e(env)?.runtime).toBe("container");
  expect(() =>
    validateLocalE2e({
      ...env,
      TURSO_DATABASE_URL: "http://sql-run-other:8080",
    })
  ).toThrow();
  expect(() =>
    validateLocalE2e({
      ...env,
      NEXT_PUBLIC_SUPABASE_URL: "http://host.docker.internal:8000",
    })
  ).toThrow();
});

it("allows official CAPTCHA test keys only in the explicit online host profile", () => {
  const env = {
    ...localEnv(),
    E2E_CAPTCHA_MODE: "test-keys",
    E2E_CAPTCHA_SCENARIO: "pass",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  };
  expect(validateLocalE2e(env)?.runtime).toBe("host");
  expect(() => validateLocalE2e({ ...env, VERCEL: "1" })).toThrow();
  expect(() =>
    validateLocalE2e({ ...env, E2E_CAPTCHA_SCENARIO: "unexpected" })
  ).toThrow();
  const container = localE2eManifest("run-one", 0, "container");
  expect(() =>
    validateLocalE2e({
      ...env,
      E2E_MANIFEST: JSON.stringify(container),
      NEXT_PUBLIC_SUPABASE_URL: container.supabaseOrigin,
      TURSO_DATABASE_URL: container.libsqlOrigin,
    })
  ).toThrow();
  const original = process.env;
  process.env = {
    VERCEL: "1",
    NODE_ENV: "production",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };
  jest.resetModules();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(() => require("../../next.config.js")).toThrow(
      "Test CAPTCHA keys cannot be deployed"
    );
  } finally {
    process.env = original;
    jest.resetModules();
  }
});

it("requires the approved dedicated Ably key and never accepts a production-key fallback", () => {
  const env = {
    ...localEnv(),
    NEXT_PUBLIC_E2E_REALTIME_MODE: "ably",
    ABLY_E2E_KEY_ID: "local.test",
    ABLY_E2E_API_KEY: "local.test:sentinel",
  };
  expect(validateLocalE2e(env)?.runtime).toBe("host");
  expect(() => validateLocalE2e({ ...env, ABLY_E2E_API_KEY: "" })).toThrow();
  expect(() =>
    validateLocalE2e({ ...env, ABLY_E2E_KEY_ID: "other.test" })
  ).toThrow();
  expect(() =>
    validateLocalE2e({ ...env, NEXT_PUBLIC_E2E_REALTIME_MODE: "local" })
  ).toThrow();
  expect(() =>
    validateLocalE2e({ ...env, ABLY_API_KEY: "production-sentinel" })
  ).toThrow();
});
