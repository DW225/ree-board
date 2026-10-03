import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Creates an isolated SQLite database and removes it after the Jest suite. */
export function createTestDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "ree-board-test-"));
  const client = createClient({ url: `file:${join(directory, "test.db")}` });
  afterAll(() => {
    client.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    db: drizzle(client),
    withDbRetry: <T>(operation: () => Promise<T>) => operation(),
  };
}
