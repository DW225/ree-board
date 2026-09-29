import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { localMessageSchema } from "../../lib/realtime/localMessage.ts";

export async function startRelay(manifest, credential, onShutdown) {
  const url = new URL(manifest.relayOrigin);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !credential)
    throw new Error("Relay requires loopback and a credential");
  const channels = new Map();
  let failNextPublish = false;
  const expected = Buffer.from(`Bearer ${credential}`);
  const disconnectSubscribers = () => {
    for (const subscribers of channels.values())
      for (const subscriber of subscribers) subscriber.end();
  };
  const publish = async (request, response, channel) => {
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 64 * 1024) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      const parsed = localMessageSchema.safeParse(
        JSON.parse(Buffer.concat(chunks).toString("utf8"))
      );
      if (!parsed.success) {
        response.writeHead(400).end();
        return;
      }
      if (failNextPublish) {
        failNextPublish = false;
        response.writeHead(503).end();
        return;
      }
      const data = `data: ${JSON.stringify(parsed.data)}\n\n`;
      for (const subscriber of channels.get(channel) ?? []) {
        if (!subscriber.write(data)) subscriber.end();
      }
      response.writeHead(200, { "Content-Type": "application/json" }).end("{}");
    } catch {
      if (!response.headersSent) response.writeHead(400).end();
    }
  };
  const server = createServer(
    { maxHeaderSize: 8192, requestTimeout: 10_000 },
    async (request, response) => {
      const supplied = Buffer.from(request.headers.authorization ?? "");
      if (
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      ) {
        response.writeHead(401).end();
        return;
      }
      if (request.method === "POST" && request.url === "/shutdown") {
        response.writeHead(204).end();
        onShutdown();
        return;
      }
      if (request.method === "POST" && request.url === "/fail-next-publish") {
        failNextPublish = true;
        response.writeHead(204).end();
        return;
      }
      if (request.method === "POST" && request.url === "/disconnect") {
        disconnectSubscribers();
        response.writeHead(204).end();
        return;
      }
      const match = /^\/boards\/([A-Za-z0-9_-]{1,128})$/.exec(
        request.url ?? ""
      );
      if (!match) {
        response.writeHead(404).end();
        return;
      }
      const channel = `board:${match[1]}`;
      if (request.method === "GET") {
        const subscribers = channels.get(channel) ?? new Set();
        if (subscribers.size >= 16 || channels.size >= 128) {
          response.writeHead(503).end();
          return;
        }
        subscribers.add(response);
        channels.set(channel, subscribers);
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
        });
        response.write("event: ready\ndata: {}\n\n");
        const expiry = setTimeout(() => response.end(), 60_000);
        const heartbeat = setInterval(() => {
          if (!response.write(": heartbeat\n\n")) response.end();
        }, 15_000);
        response.once("close", () => {
          clearTimeout(expiry);
          clearInterval(heartbeat);
          subscribers.delete(response);
          if (subscribers.size === 0) channels.delete(channel);
        });
        return;
      }
      if (request.method !== "POST") {
        response.writeHead(405).end();
        return;
      }
      await publish(request, response, channel);
    }
  );
  await new Promise((ready, reject) => {
    server.once("error", reject);
    server.listen(Number(url.port), "127.0.0.1", ready);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    async close() {
      disconnectSubscribers();
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    },
  };
}
