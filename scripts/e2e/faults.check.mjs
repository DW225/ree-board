import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { startFaultControl } from "./faults.mjs";

test("fault responses replace symlinks without writing outside the owned directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "ree-fault-check-"));
  const outside = `${root}-sentinel`;
  const id = randomUUID();
  const calls = [];
  let stop;
  try {
    await writeFile(outside, "unchanged");
    await symlink(outside, join(root, "fault-response.json"));
    stop = startFaultControl(
      root,
      "local-credential",
      { sql: "owned-sql", mail: "owned-mail" },
      async (args) => {
        calls.push(args);
      }
    );
    await writeFile(
      join(root, "fault-request.json"),
      JSON.stringify({
        id,
        service: "sql",
        operation: "stop",
        credential: "local-credential",
      })
    );
    const deadline = Date.now() + 3000;
    while (
      (await readFile(join(root, "fault-response.json"), "utf8")) ===
        "unchanged" &&
      Date.now() < deadline
    )
      await delay(25);
    assert.equal(await readFile(outside, "utf8"), "unchanged");
    assert.deepEqual(
      JSON.parse(await readFile(join(root, "fault-response.json"), "utf8")),
      { id, ok: true }
    );
    assert.deepEqual(calls, [["stop", "owned-sql"]]);
  } finally {
    await stop?.();
    await rm(root, { recursive: true, force: true });
    await rm(outside, { force: true });
  }
});
