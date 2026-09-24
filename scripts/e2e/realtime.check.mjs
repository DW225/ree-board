import assert from "node:assert/strict";
import test from "node:test";
import { startRelay } from "./realtime.mjs";

async function* sseFrames(stream) {
  let pending = "";
  for await (const text of stream.pipeThrough(new TextDecoderStream())) {
    const frames = (pending + text).split("\n\n");
    pending = frames.pop();
    for (const frame of frames) {
      if (frame && !frame.startsWith(":")) yield frame;
    }
  }
  assert.equal(pending, "", "Relay stream ended with an incomplete frame");
}

test("relay checks read split UTF-8 events and multiple frames in one chunk", async () => {
  const frames = ["event: ready\ndata: {}", 'data: {"text":"中"}', "data: {}"];
  const bytes = new TextEncoder().encode(
    `${frames[0]}\n\n: heartbeat\n\n${frames[1]}\n\n${frames[2]}\n\n`
  );
  const split = bytes.indexOf(0xe4) + 1;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 5));
      controller.enqueue(bytes.slice(5, split));
      controller.enqueue(bytes.slice(split));
      controller.close();
    },
  });
  assert.deepEqual(await Array.fromAsync(sseFrames(stream)), frames);
});

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
    const events = sseFrames(stream.body);
    assert.match((await events.next()).value, /event: ready/);
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
    const event = (await events.next()).value;
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
      JSON.parse((await events.next()).value.split("data: ")[1].trim()),
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
