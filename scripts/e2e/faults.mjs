import { open, writeFile, rename, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { z } from "zod";

const requestSchema = z
  .object({
    id: z.uuid(),
    service: z.enum(["sql", "mail"]),
    operation: z.enum(["stop", "start"]),
    credential: z.string(),
  })
  .strict();

// The runner has no Docker socket. Only this owned directory carries fault requests.
export function startFaultControl(
  directory,
  credential,
  containers,
  runDocker
) {
  const requestPath = join(directory, "fault-request.json");
  const responsePath = join(directory, "fault-response.json");
  let pending;
  async function poll() {
    let raw;
    try {
      const file = await open(
        requestPath,
        constants.O_RDONLY | constants.O_NOFOLLOW
      );
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size > 4096)
          throw new Error("Invalid local fault file");
        raw = await file.readFile("utf8");
      } finally {
        await file.close();
      }
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    const request = requestSchema.parse(JSON.parse(raw));
    await rm(requestPath);
    if (request.credential !== credential)
      throw new Error("Invalid local fault credential");
    let ok = true;
    try {
      await runDocker([request.operation, containers[request.service]]);
    } catch {
      ok = false;
    }
    const temporary = join(directory, `fault-response-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify({ id: request.id, ok }), {
        flag: "wx",
        mode: 0o600,
      });
      await rename(temporary, responsePath);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  const timer = setInterval(() => {
    if (pending) return;
    pending = poll()
      .catch(() => console.error("Local fault control failed"))
      .finally(() => {
        pending = undefined;
      });
  }, 100);
  return async () => {
    clearInterval(timer);
    await pending;
  };
}
