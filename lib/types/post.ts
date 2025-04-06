import type { postTable } from "@/db/schema";

export type NewPost = typeof postTable.$inferInsert;
export type Post = typeof postTable.$inferSelect;
