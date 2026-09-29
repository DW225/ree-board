import { randomUUID } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { run } from "./fixtures";

export async function serviceFault(
  service: "sql" | "mail",
  operation: "stop" | "start"
) {
  const id = randomUUID();
  const request = join(run.runDirectory, "fault-request.json");
  await writeFile(
    `${request}.tmp`,
    JSON.stringify({
      id,
      service,
      operation,
      credential: process.env.E2E_RELAY_TOKEN,
    }),
    { mode: 0o600 }
  );
  await rename(`${request}.tmp`, request);
  const end = Date.now() + 35_000;
  while (Date.now() < end) {
    try {
      const result = z
        .object({ id: z.uuid(), ok: z.boolean() })
        .parse(
          JSON.parse(
            await readFile(
              join(run.runDirectory, "fault-response.json"),
              "utf8"
            )
          )
        );
      if (result.id === id) {
        if (!result.ok) throw new Error("Owned service fault failed");
        return;
      }
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
    await delay(100);
  }
  throw new Error("Owned service fault timed out");
}

export async function relayFault(
  operation: "fail-next-publish" | "disconnect"
) {
  const response = await fetch(`${run.relayOrigin}/${operation}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.E2E_RELAY_TOKEN}` },
    redirect: "error",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error("Local relay fault failed");
}
