import { z } from "zod";

const runIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{2,39}$/);
const slotSchema = z.number().int().min(0).max(499);

export interface LocalE2eManifest {
  runId: string;
  slot: number;
  runtime: "host" | "container";
  appOrigin: string;
  supabaseOrigin: string;
  libsqlOrigin: string;
  relayOrigin: string;
  mailOrigin: string;
  smtpHost: string;
  smtpPort: number;
  otpExpirySeconds: number;
  runDirectory: string;
  buildDirectory: string;
}

export function localE2eManifest(
  runId: string,
  slot: number,
  runtime: "host" | "container" = "host"
): LocalE2eManifest {
  runIdSchema.parse(runId);
  slotSchema.parse(slot);
  const port = 35000 + slot * 20;
  const origin = (offset: number) => `http://127.0.0.1:${port + offset}`;
  return {
    runId,
    slot,
    runtime,
    appOrigin: `http://localhost:${port}`,
    supabaseOrigin:
      runtime === "container" ? `http://auth-${runId}:8000` : origin(1),
    libsqlOrigin:
      runtime === "container" ? `http://sql-${runId}:8080` : origin(2),
    relayOrigin: origin(3),
    mailOrigin:
      runtime === "container" ? `http://mail-${runId}:8025` : origin(4),
    smtpHost: runtime === "container" ? `mail-${runId}` : "127.0.0.1",
    smtpPort: runtime === "container" ? 1025 : port + 6,
    otpExpirySeconds: runtime === "container" ? 30 : 3600,
    runDirectory: `.e2e/${runId}`,
    buildDirectory: `.e2e/${runId}/next`,
  };
}

const manifestSchema = z
  .object({
    runId: runIdSchema,
    slot: slotSchema,
    runtime: z.enum(["host", "container"]),
    appOrigin: z.string(),
    supabaseOrigin: z.string(),
    libsqlOrigin: z.string(),
    relayOrigin: z.string(),
    mailOrigin: z.string(),
    smtpHost: z.string(),
    smtpPort: z.number().int(),
    otpExpirySeconds: z.number().int(),
    runDirectory: z.string(),
    buildDirectory: z.string(),
  })
  .strict();

export function parseLocalE2eManifest(value: unknown): LocalE2eManifest {
  const parsed = manifestSchema.safeParse(value);
  if (!parsed.success) throw new Error("Invalid local E2E manifest");
  const expected = localE2eManifest(
    parsed.data.runId,
    parsed.data.slot,
    parsed.data.runtime
  );
  for (const field of Object.keys(expected) as (keyof LocalE2eManifest)[]) {
    if (parsed.data[field] !== expected[field]) {
      throw new Error(`Local E2E manifest mismatch: ${field}`);
    }
  }
  return expected;
}

function requireOrigin(
  value: string | undefined,
  expected: string,
  name: string
) {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error(`Invalid local E2E setting: ${name}`);
  }
  if (
    url.origin !== expected ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(`Local E2E target mismatch: ${name}`);
}

/** Call before constructing a server SDK. Errors deliberately exclude values. */
export function validateLocalE2e(
  env: Record<string, string | undefined> = process.env
): LocalE2eManifest | undefined {
  if (env.APP_ENV !== "local-e2e") {
    if (
      env.NEXT_PUBLIC_E2E_RUN_ID ||
      env.E2E_CAPTCHA_MODE ||
      env.E2E_MANIFEST
    ) {
      throw new Error("Local E2E settings require APP_ENV=local-e2e");
    }
    return undefined;
  }
  if (env.VERCEL || env.VERCEL_ENV) {
    throw new Error("Local E2E settings cannot be deployed");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(env.E2E_MANIFEST ?? "");
  } catch {
    throw new Error("Missing or invalid local E2E manifest");
  }
  const manifest = parseLocalE2eManifest(raw);
  if (env.NEXT_PUBLIC_E2E_RUN_ID !== manifest.runId) {
    throw new Error("Local E2E build identity mismatch");
  }
  requireOrigin(
    env.NEXT_PUBLIC_SUPABASE_URL,
    manifest.supabaseOrigin,
    "Supabase"
  );
  requireOrigin(env.TURSO_DATABASE_URL, manifest.libsqlOrigin, "libSQL");
  for (const name of [
    "ABLY_API_KEY",
    "TURSO_AUTH_TOKEN",
    "SENTRY_TOKEN",
    "SENTRY_AUTH_TOKEN",
  ]) {
    if (env[name])
      throw new Error(
        `External credential is not allowed in local E2E: ${name}`
      );
  }
  if (env.NEXT_PUBLIC_E2E_REALTIME_MODE === "ably") {
    if (
      manifest.runtime !== "host" ||
      !env.ABLY_E2E_KEY_ID ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(env.ABLY_E2E_KEY_ID) ||
      !env.ABLY_E2E_API_KEY?.startsWith(`${env.ABLY_E2E_KEY_ID}:`) ||
      env.ABLY_E2E_API_KEY.length <= env.ABLY_E2E_KEY_ID.length + 1
    ) {
      throw new Error("A dedicated approved Ably test key is required");
    }
  } else if (
    (env.NEXT_PUBLIC_E2E_REALTIME_MODE &&
      env.NEXT_PUBLIC_E2E_REALTIME_MODE !== "local") ||
    env.ABLY_E2E_API_KEY ||
    env.ABLY_E2E_KEY_ID
  ) {
    throw new Error("Ably test settings require the explicit online profile");
  }
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "E2E_RELAY_TOKEN",
  ]) {
    if (!env[name]) throw new Error(`Missing local E2E setting: ${name}`);
  }
  if (env.E2E_CAPTCHA_MODE === "test-keys") {
    if (
      manifest.runtime !== "host" ||
      env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== "1x00000000000000000000AA" ||
      !["pass", "reject", "duplicate"].includes(env.E2E_CAPTCHA_SCENARIO ?? "")
    ) {
      throw new Error("Invalid online CAPTCHA test configuration");
    }
  } else if (
    env.E2E_CAPTCHA_MODE !== "fixture" ||
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== "local-e2e"
  ) {
    throw new Error("Invalid local CAPTCHA configuration");
  }
  return manifest;
}
