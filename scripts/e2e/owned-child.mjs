import { spawn } from "node:child_process";

// The IPC pipe closes even if the supervisor is killed. Stop only our child group.
if (!process.send)
  throw new Error("Start this process through the local E2E supervisor");
const [file, ...args] = process.argv.slice(2);
const child = spawn(file, args, {
  env: process.env,
  stdio: "inherit",
  detached: true,
});
let timer;
function stop() {
  if (child.exitCode !== null || child.signalCode !== null || timer) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    return;
  }
  timer = setTimeout(() => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* Already stopped. */
    }
  }, 5000);
}
process.on("disconnect", stop);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("error", () => {
  process.exitCode = 1;
  process.disconnect?.();
});
child.on("exit", (code, signal) => {
  // A child can exit before its workers; remove the rest of our group too.
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    /* Group is already gone. */
  }
  clearTimeout(timer);
  process.exitCode = code ?? (signal ? 1 : 0);
  process.disconnect?.();
});
