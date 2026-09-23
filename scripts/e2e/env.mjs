import { constants } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, randomBytes } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
  appendFile,
} from "node:fs/promises";
import { createServer, createConnection } from "node:net";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import {
  localE2eManifest,
  parseLocalE2eManifest,
  validateLocalE2e,
} from "../../lib/config/localE2e.ts";

import * as isolatedTools from "./isolated.mjs";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const sqlImage =
  "ghcr.io/tursodatabase/libsql-server@sha256:81b48cb383cc52e5cedb44d8c5c6b94556062384439bba685ddfaffcf3bcc0be";
const excluded =
  "realtime,storage-api,imgproxy,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor";

export function cleanEnvironment(source = process.env) {
  return Object.fromEntries(
    ["PATH", "HOME", "TMPDIR", "TEMP", "SystemRoot"]
      .filter((key) => source[key])
      .map((key) => [key, source[key]])
  );
}

export async function assertCleanCheckout(directory) {
  const names = await readdir(directory);
  const blocked = names.some(
    (name) =>
      /^\.env(?:\.(?:local|production|development|test)(?:\.local)?)?$/.test(
        name
      ) || name === ".env.sentry-build-plugin"
  );
  if (blocked)
    throw new Error(
      "Local E2E refuses a checkout with a Next environment file. Use a clean worktree."
    );
}

function safeLog(text) {
  return String(text)
    .split("\n")
    .filter(
      (line) =>
        !/secret|password|key|token|bearer|postgres(?:ql)?:\/\//i.test(line)
    )
    .join("\n")
    .replace(/([?&](?:token_hash|token|code)=)[^\s&"']+/gi, "$1[redacted]");
}

export async function command(file, args, env, logDirectory, timeout, signal) {
  signal?.throwIfAborted();
  const child = spawnOwned(file, args, env);
  let stdout = "",
    stderr = "",
    bytes = 0,
    failed = false;
  const stop = () => {
    failed = true;
    child.kill("SIGTERM");
  };
  const capture = (chunk, output) => {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 20 * 1024 * 1024) {
      stop();
      return;
    }
    if (output === "stdout") stdout += chunk;
    else stderr += chunk;
  };
  child.stdout
    .setEncoding("utf8")
    .on("data", (chunk) => capture(chunk, "stdout"));
  child.stderr
    .setEncoding("utf8")
    .on("data", (chunk) => capture(chunk, "stderr"));
  child.once("error", () => {
    failed = true;
  });
  const closed = new Promise((done) => child.once("close", done));
  const timer = setTimeout(stop, timeout ?? 600_000);
  signal?.addEventListener("abort", stop, { once: true });
  if (signal?.aborted) stop();
  try {
    const code = await closed;
    if (!failed && code === 0) return stdout;
    if (logDirectory)
      await appendFile(
        join(logDirectory, "setup.log"),
        safeLog(stdout + "\n" + stderr) + "\n",
        {
          mode: 0o600,
          flag:
            constants.O_WRONLY |
            constants.O_CREAT |
            constants.O_APPEND |
            constants.O_NOFOLLOW,
        }
      );
    throw new Error(
      `Local E2E command failed: ${file}. See the run's setup.log.`
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}

export async function waitFor(check, label, timeout, signal) {
  const end = Date.now() + (timeout ?? 120_000);
  while (Date.now() < end) {
    signal?.throwIfAborted();
    try {
      if (await check()) return;
    } catch {
      /* Service is not ready yet. */
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

export async function sqlReady(url, signal) {
  const { createClient } = await import("@libsql/client");
  signal?.throwIfAborted();
  const sql = createClient({
    url,
    fetch: (request) =>
      fetch(request, {
        signal: AbortSignal.any(
          [signal, request.signal, AbortSignal.timeout(2000)].filter(Boolean)
        ),
      }),
  });
  try {
    await sql.execute("SELECT 1");
    return true;
  } finally {
    sql.close();
  }
}

export function smtpReady(manifest) {
  return new Promise((resolveReady) => {
    const socket = createConnection({
      host: manifest.smtpHost,
      port: manifest.smtpPort,
    });
    const finish = (ready) => {
      socket.destroy();
      resolveReady(ready);
    };
    socket.setTimeout(2000, () => finish(false));
    socket.once("error", () => finish(false));
    socket.once("data", (data) => finish(data.toString().startsWith("220 ")));
    socket.once("end", () => finish(false));
  });
}

async function checkPort(port) {
  const server = createServer();
  await new Promise((resolveReady, reject) => {
    server.once("error", () =>
      reject(new Error(`Local E2E port ${port} is already in use`))
    );
    server.listen(port, "127.0.0.1", resolveReady);
  });
  await new Promise((resolveClosed) => server.close(resolveClosed));
}

export function spawnOwned(file, args, env) {
  return spawn(
    process.execPath,
    [join(root, "scripts/e2e/owned-child.mjs"), file, ...args],
    {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    }
  );
}

export async function stopChild(child) {
  if (child?.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((done) => child.once("exit", done));
  child.kill("SIGTERM");
  await exited;
}

async function removeOwnedServices(manifest) {
  const env = cleanEnvironment();
  const directory = join(root, manifest.runDirectory);
  const project = `ree-${manifest.runId}`;
  const list = async (kind, filter) =>
    (
      await command(
        "docker",
        [
          kind,
          "ls",
          "--quiet",
          "--filter",
          filter,
          ...(kind === "container" ? ["--all"] : []),
        ],
        env,
        directory,
        30_000
      )
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const containers = new Set([
    ...(await list("container", `label=com.supabase.cli.workdir=${directory}`)),
    ...(await list("container", `label=ree-board.e2e.run=${manifest.runId}`)),
  ]);
  for (const id of containers) {
    try {
      const { stdout, stderr } = await exec(
        "docker",
        ["logs", "--tail", "50", id],
        { env, timeout: 5000, maxBuffer: 1024 * 1024 }
      );
      await appendFile(
        join(directory, "services.log"),
        safeLog(stdout + "\n" + stderr) + "\n",
        {
          mode: 0o600,
          flag:
            constants.O_WRONLY |
            constants.O_CREAT |
            constants.O_APPEND |
            constants.O_NOFOLLOW,
        }
      );
    } catch {
      /* Diagnostics must not prevent cleanup. */
    }
  }
  if (containers.size)
    await command(
      "docker",
      ["rm", "--force", ...containers],
      env,
      directory,
      30_000
    );
  const volumes = await list(
    "volume",
    `label=com.supabase.cli.project=${project}`
  );
  if (volumes.length)
    await command(
      "docker",
      ["volume", "rm", ...volumes],
      env,
      directory,
      30_000
    );
  const networks = await list(
    "network",
    `label=ree-board.e2e.run=${manifest.runId}`
  );
  if (networks.length)
    await command(
      "docker",
      ["network", "rm", ...networks],
      env,
      directory,
      30_000
    );
  const images = await list(
    "image",
    `label=ree-board.e2e.run=${manifest.runId}`
  );
  if (images.length)
    await command(
      "docker",
      ["image", "rm", ...new Set(images)],
      env,
      directory,
      30_000
    );
}

function localEnvironment(
  manifest,
  baseEnv,
  status,
  captchaScenario,
  ablySettings
) {
  return {
    ...(manifest.runtime === "container" ? {} : baseEnv),
    NODE_ENV: "production",
    APP_ENV: "local-e2e",
    E2E_MANIFEST: JSON.stringify(manifest),
    NEXT_PUBLIC_E2E_RUN_ID: manifest.runId,
    NEXT_PUBLIC_SUPABASE_URL: manifest.supabaseOrigin,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      status.PUBLISHABLE_KEY || status.ANON_KEY,
    SUPABASE_SECRET_KEY: status.SECRET_KEY || status.SERVICE_ROLE_KEY,
    TURSO_DATABASE_URL: manifest.libsqlOrigin,
    TURSO_AUTH_TOKEN: "",
    ABLY_API_KEY: "",
    SENTRY_TOKEN: "",
    SENTRY_AUTH_TOKEN: "",
    NEXT_TELEMETRY_DISABLED: "1",
    E2E_RELAY_TOKEN: randomBytes(32).toString("hex"),
    NEXT_PUBLIC_E2E_REALTIME_MODE: ablySettings ? "ably" : "local",
    ...ablySettings,
    E2E_CAPTCHA_MODE: captchaScenario ? "test-keys" : "fixture",
    E2E_CAPTCHA_SCENARIO: captchaScenario ?? "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: captchaScenario
      ? "1x00000000000000000000AA"
      : "local-e2e",
  };
}

async function start(slot, isolated, captchaScenario, ablySettings) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Local E2E requires Node 24 or later");
  await assertCleanCheckout(root);
  await mkdir(join(root, ".e2e"), { recursive: true, mode: 0o700 });
  const manifest = localE2eManifest(
    `run-${randomUUID()}`,
    slot,
    isolated ? "container" : "host"
  );
  const runDirectory = join(root, manifest.runDirectory);
  const slotFile = join(root, ".e2e", "active.json");
  await mkdir(runDirectory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(slotFile, JSON.stringify(manifest), {
      flag: "wx",
      mode: 0o600,
    });
  } catch {
    throw new Error(
      `Slot ${slot} already exists. Use e2e:down for that slot first.`
    );
  }
  const baseEnv = cleanEnvironment();
  const project = `ree-${manifest.runId}`;
  let network = `${project}-network`;
  const sqlContainer = `${project}-sql`;
  const nextBin = join(root, "node_modules/next/dist/bin/next");
  const supabaseBin = join(root, "node_modules/.bin/supabase");
  const port = 35000 + slot * 20;
  let app;
  let testChild;
  let relay;
  let stopFaults;
  let starting = true;
  let cleanupPromise;
  let finish;
  const abort = new AbortController();
  const runCommand = (file, args, env, directory, timeout) =>
    command(file, args, env, directory, timeout, abort.signal);
  const ready = (check, label) => waitFor(check, label, 120_000, abort.signal);
  const stoppedPromise = new Promise((resolveStopped) => {
    finish = resolveStopped;
  });
  const cleanup = () => {
    cleanupPromise ??= (async () => {
      try {
        await stopFaults?.();
        await stopChild(testChild);
        await stopChild(app);
        await relay?.close();
        await removeOwnedServices(manifest);
        await rm(join(runDirectory, "env.json"), { force: true });
        await rm(join(runDirectory, "owner.json"), { force: true });
        await rm(slotFile, { force: true });
      } finally {
        finish();
      }
    })();
    return cleanupPromise;
  };
  const stopSignal = () => {
    abort.abort();
    if (!starting)
      void cleanup().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  };
  process.once("SIGINT", stopSignal);
  process.once("SIGTERM", stopSignal);
  try {
    await writeFile(
      join(runDirectory, "owner.json"),
      JSON.stringify({ pid: process.pid }),
      { mode: 0o600 }
    );
    for (let offset = 0; offset <= 8; offset++) await checkPort(port + offset);
    await runCommand(
      "docker",
      ["info", "--format", "{{.ServerVersion}}"],
      baseEnv,
      runDirectory,
      10_000
    );
    const version = (
      await runCommand(
        supabaseBin,
        ["--version"],
        baseEnv,
        runDirectory,
        10_000
      )
    ).trim();
    if (version !== "2.117.0")
      throw new Error("Use the pinned Supabase CLI 2.117.0");
    const runnerImage = isolated
      ? await isolatedTools.prepareImage(manifest, runCommand)
      : undefined;
    const template = await readFile(join(root, "supabase/config.toml"), "utf8");
    // Official public dummy keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
    const captchaSecrets = {
      pass: "1x0000000000000000000000000000000AA",
      reject: "2x0000000000000000000000000000000AA",
      duplicate: "3x0000000000000000000000000000000AA",
    };
    const replacements = {
      OTP_EXPIRY: manifest.otpExpirySeconds,
      JWT_EXPIRY: isolated ? 120 : 3600,
      CAPTCHA_ENABLED: Boolean(captchaScenario),
      CAPTCHA_SECRET: captchaSecrets[captchaScenario] ?? "",
      PROJECT: project,
      API_PORT: port + 1,
      DB_PORT: port + 5,
      SHADOW_PORT: port + 7,
      MAIL_PORT: port + 4,
      SMTP_PORT: port + 6,
      POP_PORT: port + 8,
      APP_ORIGIN: manifest.appOrigin,
      AUTH_ORIGIN: manifest.supabaseOrigin,
    };
    const config = template.replace(/__([A-Z_]+)__/g, (_, key) => {
      if (!(key in replacements))
        throw new Error("Unknown Supabase template setting");
      return String(replacements[key]);
    });
    await mkdir(join(runDirectory, "supabase"), { recursive: true });
    await writeFile(join(runDirectory, "supabase/config.toml"), config);
    await cp(
      join(root, "supabase/templates"),
      join(runDirectory, "supabase/templates"),
      { recursive: true }
    );
    await runCommand(
      "docker",
      [
        "network",
        "create",
        "--label",
        `ree-board.e2e.run=${manifest.runId}`,
        "--opt",
        "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
        network,
      ],
      baseEnv,
      runDirectory
    );
    console.log(
      "Starting local Supabase and Mailpit (the first run downloads images)..."
    );
    await runCommand(
      supabaseBin,
      [
        "start",
        "--workdir",
        runDirectory,
        "--network-id",
        network,
        "--exclude",
        excluded,
      ],
      baseEnv,
      runDirectory
    );
    const status = JSON.parse(
      await runCommand(
        supabaseBin,
        ["status", "--workdir", runDirectory, "--output", "json"],
        baseEnv,
        runDirectory
      )
    );
    if (
      status.API_URL !== manifest.supabaseOrigin &&
      status.API_URL !== localE2eManifest(manifest.runId, slot).supabaseOrigin
    )
      throw new Error("Supabase returned an unexpected local URL");
    const env = localEnvironment(
      manifest,
      baseEnv,
      status,
      captchaScenario,
      ablySettings
    );
    validateLocalE2e(env);
    await writeFile(join(runDirectory, "env.json"), JSON.stringify(env), {
      mode: 0o600,
    });
    let serviceIds = [];
    if (isolated) {
      console.log(
        "Removing external network access from the owned services..."
      );
      const runtimeNetwork = await isolatedTools.isolateServices(
        manifest,
        network,
        runCommand
      );
      network = runtimeNetwork.network;
      serviceIds = runtimeNetwork.ids;
    }
    await mkdir(join(runDirectory, "sql"));
    const sqlId = (
      await runCommand(
        "docker",
        [
          "run",
          "--detach",
          "--name",
          sqlContainer,
          "--network",
          network,
          "--network-alias",
          `sql-${manifest.runId}`,
          "--label",
          `ree-board.e2e.run=${manifest.runId}`,
          ...(isolated ? [] : ["--publish", `127.0.0.1:${port + 2}:8080`]),
          "--mount",
          `type=bind,src=${join(runDirectory, "sql")},dst=/var/lib/sqld`,
          sqlImage,
        ],
        baseEnv,
        runDirectory
      )
    ).trim();
    const mailIds = (
      await runCommand(
        "docker",
        [
          "ps",
          "--all",
          "--quiet",
          "--filter",
          `label=com.supabase.cli.workdir=${runDirectory}`,
          "--filter",
          "name=supabase_inbucket_",
        ],
        baseEnv,
        runDirectory
      )
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (mailIds.length !== 1)
      throw new Error("Expected one owned Mailpit container");
    const { startFaultControl } = await import("./faults.mjs");
    stopFaults = startFaultControl(
      runDirectory,
      env.E2E_RELAY_TOKEN,
      { sql: sqlId, mail: mailIds[0] },
      (args) => command("docker", args, baseEnv, runDirectory, 30_000)
    );
    const { startRelay } = await import("./realtime.mjs");
    abort.signal.throwIfAborted();
    // In container mode this loopback relay handles supervisor shutdown only.
    relay = await startRelay(manifest, env.E2E_RELAY_TOKEN, () => {
      setImmediate(stopSignal);
    });
    if (isolated) {
      await isolatedTools.checkServiceNetworks(
        manifest,
        network,
        [...serviceIds, sqlId],
        runnerImage,
        runCommand
      );
      abort.signal.throwIfAborted();
      testChild = spawnOwned(
        "docker",
        [
          "run",
          "--rm",
          "--init",
          "--shm-size",
          "1g",
          "--name",
          `${project}-runner`,
          "--network",
          network,
          "--label",
          `ree-board.e2e.run=${manifest.runId}`,
          "--mount",
          `type=bind,src=${runDirectory},dst=/app/${manifest.runDirectory}`,
          "--mount",
          `type=bind,src=${join(runDirectory, "env.json")},dst=/run/e2e-env.json,readonly`,
          runnerImage,
        ],
        baseEnv
      );
      starting = false;
      console.log(`Isolated run: ${manifest.runId}\nReports: ${runDirectory}`);
      return { manifest, env, cleanup, stoppedPromise, runner: testChild };
    }
    await ready(() => sqlReady(manifest.libsqlOrigin, abort.signal), "libSQL");
    console.log("Checking the empty database migration history...");
    await runCommand(
      process.execPath,
      ["scripts/e2e/migrate.mjs"],
      env,
      runDirectory,
      60_000
    );
    await ready(
      async () =>
        (
          await fetch(`${manifest.mailOrigin}/api/v1/messages`, {
            signal: AbortSignal.timeout(2000),
          })
        ).ok,
      "Mailpit"
    );
    await ready(() => smtpReady(manifest), "Mailpit SMTP");
    await writeFile(
      join(runDirectory, "tsconfig.json"),
      JSON.stringify({
        extends: "../../tsconfig.json",
        include: ["../../**/*.ts", "../../**/*.tsx"],
        exclude: ["../../node_modules", "../../scripts/**/*.ts", "../*"],
      })
    );
    console.log("Building the app with local service settings...");
    await runCommand(
      process.execPath,
      [nextBin, "build", "--webpack"],
      env,
      runDirectory
    );
    abort.signal.throwIfAborted();
    app = spawnOwned(
      process.execPath,
      [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)],
      env
    );
    for (const output of [app.stdout, app.stderr])
      output.on("data", (data) => {
        void appendFile(
          join(runDirectory, "app.log"),
          safeLog(data.toString()),
          {
            mode: 0o600,
            flag:
              constants.O_WRONLY |
              constants.O_CREAT |
              constants.O_APPEND |
              constants.O_NOFOLLOW,
          }
        );
      });
    await ready(async () => {
      if (app.exitCode !== null) throw new Error("Local app stopped");
      const response = await fetch(`${manifest.appOrigin}/api/e2e/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok && (await response.json()).runId === manifest.runId;
    }, "the owned app");
    console.log(
      `App: ${manifest.appOrigin}\nInbox: ${manifest.mailOrigin}\nRun: ${manifest.runId}\nReports: ${runDirectory}\nUse a separate browser context/profile for this run.`
    );
    starting = false;
    abort.signal.throwIfAborted();
    return {
      manifest,
      env,
      cleanup,
      stoppedPromise,
      setTestChild: (child) => {
        testChild = child;
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function down(slot) {
  const slotFile = join(root, ".e2e", "active.json");
  let manifest;
  try {
    manifest = parseLocalE2eManifest(
      JSON.parse(await readFile(slotFile, "utf8"))
    );
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (manifest.slot !== slot) throw new Error("Local slot identity mismatch");
  const directory = join(root, manifest.runDirectory);
  let response;
  try {
    const env = JSON.parse(await readFile(join(directory, "env.json"), "utf8"));
    if (validateLocalE2e(env)?.runId !== manifest.runId)
      throw new Error("Local run identity mismatch");
    response = await fetch(`${manifest.relayOrigin}/shutdown`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.E2E_RELAY_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    if (
      error.code !== "ENOENT" &&
      !(error instanceof TypeError) &&
      error.name !== "TimeoutError"
    )
      throw error;
  }
  if (response?.ok) {
    await waitFor(async () => {
      try {
        await readFile(slotFile);
        return false;
      } catch (error) {
        return error.code === "ENOENT";
      }
    }, "local teardown");
    return;
  }
  if (response) throw new Error("The owned supervisor refused shutdown");
  // Refuse to race a supervisor that is still starting. Never kill an unknown PID.
  try {
    const owner = JSON.parse(
      await readFile(join(directory, "owner.json"), "utf8")
    );
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 1)
      throw new Error("Invalid local owner record");
    process.kill(owner.pid, 0);
    throw new Error(
      "The local supervisor is still active. Stop its terminal with Ctrl+C."
    );
  } catch (error) {
    if (!["ENOENT", "ESRCH"].includes(error.code)) throw error;
  }
  await removeOwnedServices(manifest);
  await rm(join(directory, "env.json"), { force: true });
  await rm(join(directory, "owner.json"), { force: true });
  await rm(slotFile, { force: true });
}

function approvedAblySettings() {
  const { ABLY_E2E_API_KEY, ABLY_E2E_KEY_ID } = process.env;
  if (
    !ABLY_E2E_API_KEY ||
    !ABLY_E2E_KEY_ID ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ABLY_E2E_KEY_ID) ||
    !ABLY_E2E_API_KEY.startsWith(`${ABLY_E2E_KEY_ID}:`) ||
    ABLY_E2E_API_KEY.length <= ABLY_E2E_KEY_ID.length + 1
  ) {
    throw new Error(
      "Set ABLY_E2E_API_KEY and ABLY_E2E_KEY_ID for a dedicated test app. No production-key fallback is allowed."
    );
  }
  return { ABLY_E2E_API_KEY, ABLY_E2E_KEY_ID };
}

async function main() {
  const [operation, ...args] = process.argv.slice(2);
  const slotIndex = args.indexOf("--slot");
  const slot = slotIndex === -1 ? 0 : Number(args[slotIndex + 1]);
  localE2eManifest("run-check", slot);
  if (operation === "down" || operation === "reset") await down(slot);
  if (operation === "down") return;
  if (!["up", "reset", "test", "captcha", "ably"].includes(operation))
    throw new Error(
      "Use up, down, reset, test, captcha, or ably, with --slot 0"
    );
  const ablySettings =
    operation === "ably" ? approvedAblySettings() : undefined;
  const scenarios =
    operation === "captcha" ? ["pass", "reject", "duplicate"] : [undefined];
  const testConfigs = {
    test: "playwright.local.config.ts",
    captcha: "playwright.captcha.config.ts",
    ably: "playwright.ably.config.ts",
  };
  const config = testConfigs[operation];
  for (const scenario of scenarios) {
    if (scenario) console.log(`Online Turnstile check: ${scenario}`);
    const run = await start(
      slot,
      operation === "test" && !args.includes("--host"),
      scenario,
      ablySettings
    );
    try {
      if (!config) return await run.stoppedPromise;
      const child =
        run.runner ??
        spawnOwned(
          join(root, "node_modules/.bin/playwright"),
          ["test", "--config", config],
          run.env
        );
      run.setTestChild?.(child);
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
      const code = await new Promise((resolveExit) =>
        child.once("exit", resolveExit)
      );
      if (code !== 0)
        throw new Error("Local E2E test failed; see the run report");
    } finally {
      await run.cleanup();
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
