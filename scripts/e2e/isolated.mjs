import { constants } from "node:fs";
import { readFile, appendFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { request } from "node:http";
import {
  command,
  waitFor,
  spawnOwned,
  stopChild,
  smtpReady,
  sqlReady,
} from "./env.mjs";
import { validateLocalE2e } from "../../lib/config/localE2e.ts";

const root = resolve(import.meta.dirname, "../..");

export async function prepareImage(manifest, env, runCommand) {
  const uid = process.getuid?.();
  const gid = process.getgid?.();
  if (!Number.isInteger(uid) || uid === 0 || !Number.isInteger(gid)) {
    throw new Error("Run local E2E from a non-root macOS or Linux account");
  }
  const image = `ree-board-e2e:${manifest.runId}`;
  console.log(
    "Preparing the pinned Linux browser image (cached after the first run)..."
  );
  await runCommand(
    "docker",
    [
      "build",
      "--build-arg",
      `E2E_UID=${uid}`,
      "--build-arg",
      `E2E_GID=${gid}`,
      "--file",
      "scripts/e2e/Dockerfile",
      "--tag",
      image,
      "--label",
      `ree-board.e2e.run=${manifest.runId}`,
      ".",
    ],
    env,
    join(root, manifest.runDirectory),
    1_200_000
  );
  await runCommand(
    "docker",
    [
      "run",
      "--rm",
      image,
      "node",
      "scripts/e2e/network-check.mjs",
      "--positive-control",
    ],
    env,
    join(root, manifest.runDirectory),
    30_000
  );
  return image;
}

async function readGeneratedFiles(id, state, dockerApi) {
  const name = state.Name.slice(1);
  // The CLI copies gateway certificates into its writable layer, outside mounts.
  // Keep this generated material in memory while moving the owned container.
  const copiedFiles = [];
  if (name.startsWith("supabase_kong_")) {
    for (const value of state.Config.Env ?? []) {
      const match =
        /^KONG_(?:SSL_CERT|SSL_CERT_KEY|DECLARATIVE_CONFIG)=(\/home\/kong\/[a-zA-Z0-9_.-]+)$/.exec(
          value
        );
      if (match)
        copiedFiles.push({
          directory: "/home/kong",
          archive: await dockerApi(
            "GET",
            `/containers/${id}/archive?path=${encodeURIComponent(match[1])}`,
            undefined,
            200
          ),
        });
    }
  }
  if (name.startsWith("supabase_db_")) {
    copiedFiles.push({
      directory: "/etc/postgresql-custom",
      archive: await dockerApi(
        "GET",
        `/containers/${id}/archive?path=/etc/postgresql-custom/pgsodium_root.key`,
        undefined,
        200
      ),
    });
  }
  return copiedFiles;
}

export async function isolateServices(manifest, bootstrap, env, runCommand) {
  const directory = join(root, manifest.runDirectory);
  const network = `ree-${manifest.runId}-isolated`;
  const exec = (args, timeout = 60_000) =>
    runCommand("docker", args, env, directory, timeout);
  const ids = (
    await exec([
      "ps",
      "--all",
      "--quiet",
      "--filter",
      `label=com.supabase.cli.workdir=${directory}`,
    ])
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (ids.length !== 4)
    throw new Error(
      "Expected only the owned Auth, database, gateway, and Mailpit containers"
    );
  await exec([
    "network",
    "create",
    "--internal",
    "--opt",
    "com.docker.network.bridge.gateway_mode_ipv4=isolated",
    "--label",
    `ree-board.e2e.run=${manifest.runId}`,
    network,
  ]);
  const socketPath = env.DOCKER_HOST.slice("unix://".length);
  const dockerApi = (method, path, body, status) =>
    new Promise((done, reject) => {
      const connection = request(
        {
          socketPath,
          path,
          method,
          headers: {
            "Content-Type": Buffer.isBuffer(body)
              ? "application/x-tar"
              : "application/json",
          },
        },
        (response) => {
          const chunks = [];
          response.once("error", () =>
            reject(new Error("Docker response interrupted"))
          );
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            if (response.statusCode !== status) {
              reject(
                new Error(
                  `Owned container migration ${method} failed (Docker status ${response.statusCode})`
                )
              );
              return;
            }
            done(Buffer.concat(chunks));
          });
        }
      );
      connection.setTimeout(30_000, () =>
        connection.destroy(new Error("Docker migration timed out"))
      );
      connection.once("error", reject);
      connection.end(
        body === undefined || Buffer.isBuffer(body)
          ? body
          : JSON.stringify(body)
      );
    });
  const recreated = [];
  for (const id of ids) {
    // Config includes only this disposable stack's generated credentials. Never log it.
    const state = JSON.parse(
      await exec(["inspect", "--format", "{{json .}}", id])
    );
    const attachments = state.NetworkSettings.Networks;
    if (
      state.Config.Labels["com.supabase.cli.workdir"] !== directory ||
      Object.keys(attachments).length !== 1 ||
      !attachments[bootstrap]
    )
      throw new Error("Unexpected bootstrap ownership or network attachment");
    const name = state.Name.slice(1);
    const aliases = new Set(attachments[bootstrap].Aliases ?? []);
    if (name.startsWith("supabase_kong_"))
      aliases.add(`auth-${manifest.runId}`);
    if (name.startsWith("supabase_inbucket_"))
      aliases.add(`mail-${manifest.runId}`);
    const copiedFiles = await readGeneratedFiles(id, state, dockerApi);
    await exec(["rm", "--force", id]);
    const created = await dockerApi(
      "POST",
      `/containers/create?name=${encodeURIComponent(name)}`,
      {
        ...state.Config,
        HostConfig: {
          ...state.HostConfig,
          NetworkMode: network,
          PortBindings: {},
          PublishAllPorts: false,
        },
        NetworkingConfig: {
          EndpointsConfig: { [network]: { Aliases: [...aliases] } },
        },
      },
      201
    );
    const newId = JSON.parse(created.toString()).Id;
    for (const file of copiedFiles)
      await dockerApi(
        "PUT",
        `/containers/${newId}/archive?path=${encodeURIComponent(file.directory)}`,
        file.archive,
        200
      );
    recreated.push(newId);
  }
  await exec(["network", "rm", bootstrap]);
  await exec(["start", ...recreated]);
  const networkState = JSON.parse(
    await exec(["network", "inspect", "--format", "{{json .}}", network])
  );
  if (
    !networkState.Internal ||
    networkState.Options["com.docker.network.bridge.gateway_mode_ipv4"] !==
      "isolated"
  ) {
    throw new Error("Runtime network is not isolated");
  }
  return { network, ids: recreated };
}

export async function checkServiceNetworks(
  manifest,
  network,
  ids,
  image,
  env,
  runCommand
) {
  const directory = join(root, manifest.runDirectory);
  for (const id of ids) {
    const networks = JSON.parse(
      await runCommand(
        "docker",
        ["inspect", "--format", "{{json .NetworkSettings.Networks}}", id],
        env,
        directory
      )
    );
    if (Object.keys(networks).length !== 1 || !networks[network])
      throw new Error("A local service has an external network attachment");
    await runCommand(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        `container:${id}`,
        "--label",
        `ree-board.e2e.run=${manifest.runId}`,
        image,
        "node",
        "scripts/e2e/network-check.mjs",
        "--probe",
      ],
      env,
      directory,
      20_000
    );
  }
  console.log(
    "Auth, database, Mailpit, gateway, and libSQL have no runtime egress."
  );
}

async function main() {
  // Only the generated run directory is mounted. No host home, source, or Docker socket is mounted.
  const supplied = JSON.parse(await readFile("/run/e2e-env.json", "utf8"));
  Object.assign(process.env, supplied);
  const manifest = validateLocalE2e();
  if (manifest?.runtime !== "container")
    throw new Error("Isolated runner requires its container manifest");
  const directory = join(root, manifest.runDirectory);
  const { checkBlockedNetwork } = await import("./network-check.mjs");
  await checkBlockedNetwork(true);
  await waitFor(() => sqlReady(manifest.libsqlOrigin), "isolated libSQL");
  await waitFor(
    async () =>
      (
        await fetch(`${manifest.supabaseOrigin}/auth/v1/health`, {
          headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
          signal: AbortSignal.timeout(2000),
        })
      ).ok,
    "isolated Auth"
  );
  await waitFor(
    async () =>
      (
        await fetch(`${manifest.mailOrigin}/api/v1/messages`, {
          signal: AbortSignal.timeout(2000),
        })
      ).ok,
    "isolated Mailpit"
  );
  await waitFor(() => smtpReady(manifest), "isolated Mailpit SMTP");
  await command(
    process.execPath,
    ["scripts/e2e/migrate.mjs"],
    process.env,
    directory,
    60_000
  );
  await writeFile(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      extends: "../../tsconfig.json",
      include: ["../../**/*.ts", "../../**/*.tsx"],
      exclude: ["../../node_modules", "../../scripts/**/*.ts", "../*"],
    })
  );
  const { startRelay } = await import("./realtime.mjs");
  const relay = await startRelay(
    manifest,
    process.env.E2E_RELAY_TOKEN,
    () => {}
  );
  let app;
  let tests;
  try {
    console.log(
      "Building and testing the real app inside the isolated network..."
    );
    await command(
      process.execPath,
      ["node_modules/next/dist/bin/next", "build", "--webpack"],
      process.env,
      directory
    );
    app = spawnOwned(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        new URL(manifest.appOrigin).port,
      ],
      process.env
    );
    for (const output of [app.stdout, app.stderr])
      output.on("data", (data) => {
        const safe = data
          .toString()
          .split("\n")
          .filter((line) => !/secret|password|key|token|bearer/i.test(line))
          .join("\n");
        void appendFile(join(directory, "app.log"), safe, {
          mode: 0o600,
          flag:
            constants.O_WRONLY |
            constants.O_CREAT |
            constants.O_APPEND |
            constants.O_NOFOLLOW,
        });
      });
    await waitFor(async () => {
      const response = await fetch(`${manifest.appOrigin}/api/e2e/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok && (await response.json()).runId === manifest.runId;
    }, "isolated app");
    tests = spawnOwned(
      "node_modules/.bin/playwright",
      ["test", "--config", "playwright.local.config.ts"],
      process.env
    );
    tests.stdout.pipe(process.stdout);
    tests.stderr.pipe(process.stderr);
    const code = await new Promise((done) => tests.once("exit", done));
    if (code !== 0) throw new Error("Isolated E2E tests failed");
  } finally {
    await stopChild(tests);
    await stopChild(app);
    await relay.close();
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
