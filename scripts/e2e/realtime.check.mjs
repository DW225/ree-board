import assert from "node:assert/strict";
import test from "node:test";
import { startRelay } from "./realtime.mjs";

test("the local relay requires its credential and delivers validated board events", async () => {
  const relay = await startRelay(
    { runId: "run-check", relayOrigin: "http://127.0.0.1:0" },
    "test-credential",
    () => {}
  );
  const headers = {
    Authorization: "Bearer test-credential",
    "Content-Type": "application/json",
  };
  const controller = new AbortController();
  try {
    assert.equal((await fetch(relay.origin + "/boards/board-a")).status, 401);
    const stream = await fetch(relay.origin + "/boards/board-a", {
      headers,
      signal: controller.signal,
    });
    const reader = stream.body.getReader();
    assert.match(
      new TextDecoder().decode((await reader.read()).value),
      /event: ready/
    );
    assert.equal(
      (
        await fetch(relay.origin + "/boards/board-a", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      400
    );
    const message = {
      name: "POST_UPDATE_CONTENT",
      data: '{"id":"post-a","content":"changed"}',
      extras: { headers: { user: "actor" } },
    };
    const response = await fetch(relay.origin + "/boards/board-a", {
      method: "POST",
      headers,
      body: JSON.stringify(message),
    });
    assert.deepEqual(await response.json(), {});
    const event = new TextDecoder().decode((await reader.read()).value);
    assert.deepEqual(JSON.parse(event.split("data: ")[1].trim()), message);
    const unassign = {
      name: "ACTION_ASSIGN",
      data: '{"id":"task-a","userId":null}',
      extras: { headers: { user: null } },
    };
    assert.equal(
      (
        await fetch(relay.origin + "/boards/board-a", {
          method: "POST",
          headers,
          body: JSON.stringify(unassign),
        })
      ).status,
      200
    );
    assert.deepEqual(
      JSON.parse(
        new TextDecoder()
          .decode((await reader.read()).value)
          .split("data: ")[1]
          .trim()
      ),
      unassign
    );
    for (const path of ["/shutdown", "/fail-next-publish", "/disconnect"]) {
      assert.equal(
        (await fetch(relay.origin + path, { method: "POST" })).status,
        401
      );
    }
    assert.equal(
      (
        await fetch(relay.origin + "/fail-next-publish", {
          method: "POST",
          headers,
        })
      ).status,
      204
    );
    assert.equal(
      (
        await fetch(relay.origin + "/boards/board-a", {
          method: "POST",
          headers,
          body: JSON.stringify(message),
        })
      ).status,
      503
    );
    assert.equal(
      (
        await fetch(relay.origin + "/boards/board-a", {
          method: "POST",
          headers,
          body: JSON.stringify(message),
        })
      ).status,
      200
    );
  } finally {
    controller.abort();
    await relay.close();
  }
});
