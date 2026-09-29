import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { validateLocalE2e } from "../../lib/config/localE2e.ts";

const manifest = validateLocalE2e();
if (!manifest)
  throw new Error("Migration runner requires a validated local E2E run");
const client = createClient({ url: manifest.libsqlOrigin });
try {
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  const first = await client.execute(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at"
  );
  await migrate(db, { migrationsFolder: "./drizzle" });
  assert.deepEqual(
    (
      await client.execute(
        "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at"
      )
    ).rows,
    first.rows
  );
  assert.equal(first.rows.length, 9);
  // Existing deployments recorded the original 0007 hash. It must stay applied.
  const repaired = await readFile("drizzle/0007_dizzy_deathbird.sql", "utf8");
  const original = repaired.replace(
    'DROP INDEX IF EXISTS "user_supabase_id_unique";',
    'DROP INDEX "user_supabase_id_unique";'
  );
  const oldHash = createHash("sha256").update(original).digest("hex");
  const oldRow = first.rows[7];
  await client.execute({
    sql: "UPDATE __drizzle_migrations SET hash = ? WHERE created_at = ?",
    args: [oldHash, oldRow.created_at],
  });
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    const recorded = await client.execute({
      sql: "SELECT hash FROM __drizzle_migrations WHERE created_at = ?",
      args: [oldRow.created_at],
    });
    assert.equal(recorded.rows[0].hash, oldHash);
  } finally {
    await client.execute({
      sql: "UPDATE __drizzle_migrations SET hash = ? WHERE created_at = ?",
      args: [oldRow.hash, oldRow.created_at],
    });
  }
  assert.deepEqual((await client.execute("PRAGMA foreign_key_check")).rows, []);
  const columns = (await client.execute("PRAGMA table_info(user)")).rows;
  assert.equal(
    columns.find((column) => column.name === "supabase_id")?.notnull,
    1
  );
  assert.equal(
    columns.some((column) => column.name === "kinde_id"),
    false
  );
  const indexes = (await client.execute("PRAGMA index_list(user)")).rows;
  assert.equal(
    indexes.find((index) => index.name === "user_supabase_id_unique")?.unique,
    1
  );
  console.log(
    "All migrations applied; schema, foreign keys and repeated replay checked."
  );
} finally {
  client.close();
}
