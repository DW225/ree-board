import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import {
  cleanEnvironment,
  assertCleanCheckout,
  command,
  waitFor,
  sqlReady,
} from "./env.mjs";

test("child processes cannot inherit hosted service credentials", () => {
  const env = cleanEnvironment({
    PATH: "/bin",
    HOME: "/tmp/local-user",
    ABLY_API_KEY: "live-sentinel",
    SUPABASE_ACCESS_TOKEN: "live-sentinel",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  });
  assert.equal(env.PATH, "/bin");
  assert.equal(env.ABLY_API_KEY, undefined);
  assert.equal(env.SUPABASE_ACCESS_TOKEN, undefined);
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, undefined);
});

test("a checkout with a Next environment file is refused without reading its contents", async () => {
  const root = await mkdtemp(join(tmpdir(), "ree-env-check-"));
  try {
    await assertCleanCheckout(root);
    await writeFile(join(root, ".env.production.local"), "sentinel");
    await assert.rejects(assertCleanCheckout(root), /environment file/);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("cancelling a startup command stops it before a later resource can start", async () => {
  const abort = new AbortController();
  const execution = command(
    process.execPath,
    ["-e", "setTimeout(() => process.exit(0), 10000)"],
    cleanEnvironment(),
    undefined,
    20_000,
    abort.signal
  );
  const timer = setTimeout(() => abort.abort(), 25);
  try {
    await assert.rejects(execution, /command failed/);
    assert.equal(abort.signal.aborted, true);
    await assert.rejects(
      command(
        process.execPath,
        ["-e", "process.exit(0)"],
        cleanEnvironment(),
        undefined,
        1000,
        abort.signal
      ),
      /abort/i
    );
  } finally {
    clearTimeout(timer);
  }
});

test("startup cancellation and timeout remove worker descendants", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ree-worker-check-"));
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  try {
    for (const mode of ["abort", "timeout"]) {
      const abort = new AbortController();
      const pidFile = join(directory, `${mode}.pid`);
      const worker = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000)`;
      const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(worker)}], { stdio: ${JSON.stringify(mode === "timeout" ? "inherit" : "ignore")} }); setInterval(() => {}, 1000)`;
      const execution = command(
        process.execPath,
        ["-e", parent],
        cleanEnvironment(),
        undefined,
        mode === "timeout" ? 3000 : 10_000,
        abort.signal
      ).then(
        () => undefined,
        (error) => error
      );
      let pid;
      try {
        await waitFor(
          async () => {
            pid = Number(await readFile(pidFile, "utf8"));
            return Number.isInteger(pid) && pid > 1;
          },
          "worker startup",
          2000
        );
        if (mode === "abort") abort.abort();
        assert.match((await execution)?.message ?? "", /command failed/);
        await waitFor(() => !alive(pid), `${mode} worker cleanup`, 2000);
      } finally {
        abort.abort();
        if (pid && alive(pid)) process.kill(pid, "SIGKILL");
        await execution;
      }
    }
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("SQL readiness cancels a server that accepts requests but never replies", async () => {
  for (const mode of ["timeout", "abort"]) {
    let received;
    const request = new Promise((resolve) => {
      received = resolve;
    });
    const server = createServer(() => received());
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const abort = new AbortController();
    const timer = new AbortController();
    const query = sqlReady(
      `http://127.0.0.1:${server.address().port}`,
      abort.signal
    ).then(
      () => "success",
      () => "failed"
    );
    const deadline = delay(4500, "still pending", { signal: timer.signal });
    try {
      assert.equal(await Promise.race([request, query, deadline]), undefined);
      if (mode === "abort") abort.abort();
      assert.equal(await Promise.race([query, deadline]), "failed");
    } finally {
      timer.abort();
      abort.abort();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await query;
    }
  }
});
