import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { actionsTable, ActionState, postTable, PostType } from "./schema";
import { nanoid } from "nanoid";

import "../envConfig";

async function main() {
  const dbUrl =
    process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:8080"
      : process.env.TURSO_DATABASE_URL!;

  if (dbUrl == undefined) {
    throw new Error("Missing TURSO_DATABASE_URL environment variable");
  }

  const dbAuthToken =
    process.env.NODE_ENV === "development"
      ? undefined
      : process.env.TURSO_AUTH_TOKEN;

  const db = drizzle(createClient({ url: dbUrl, authToken: dbAuthToken }));

  console.log("Running migrations");

  const posts = await db
    .select()
    .from(postTable)
    .where(eq(postTable.type, PostType.action_item));

  console.log(`Found ${posts.length} action items to update`);

  const batchSize = 100;
  await db.transaction(async (tx) => {
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      await tx.insert(actionsTable).values(
        batch.map((post) => ({
          id: nanoid(),
          boardId: post.boardId,
          postId: post.id,
          state: ActionState.pending, // Initialize with default state
        }))
      );
      console.log(
        `Processed ${Math.min(i + batchSize, posts.length)} of ${
          posts.length
        } items`
      );
    }
  });

  console.log("Migrated successfully");

  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed");
  console.error(e);
  process.exit(1);
});
