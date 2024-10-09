import { sql } from "drizzle-orm";
import {
  text,
  sqliteTable,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const userTable = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(), // Use Nano ID for primary key
    name: text("name").notNull().unique(),
    kinde_id: text("kinde_id").notNull().unique(),
    email: text("email").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    nameIdx: index("user_name_index").on(table.name),
  })
);

export const insertUserSchema = createInsertSchema(userTable);
export const selectUserSchema = createSelectSchema(userTable);
export type NewUser = typeof userTable.$inferInsert;

export enum BoardState {
  active,
  archived,
}

export const boardTable = sqliteTable(
  "board",
  {
    id: text("id").primaryKey(), // Use Nano ID for primary key
    title: text("title").notNull(),
    state: integer("state").$type<BoardState>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    creator: text("user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    stateIdx: index("board_state_index").on(table.state),
  })
);

export const insertBoardSchema = createInsertSchema(boardTable);
export const selectBoardSchema = createSelectSchema(boardTable);
export type NewBoard = typeof boardTable.$inferInsert;
export type Board = typeof boardTable.$inferSelect;

export enum PostType {
  "went_well",
  "to_improvement",
  "to_discuss",
  "action_item",
}

export const postTable = sqliteTable(
  "post",
  {
    id: text("id").primaryKey(),
    content: text("content").notNull(),
    author: text("user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    boardId: text("board_id")
      .references(() => boardTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    type: integer("post_type").$type<PostType>().notNull(),
    voteCount: integer("vote_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    boardIdIdx: index("post_board_id_index").on(table.boardId),
  })
);

export const insertPostSchema = createInsertSchema(postTable);
export const selectPostSchema = createSelectSchema(postTable);
export type NewPost = typeof postTable.$inferInsert;
export type Post = typeof postTable.$inferSelect;

export enum Role {
  owner,
  member,
  guest,
}

export const memberTable = sqliteTable(
  "member",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => userTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    boardId: text("board_id")
      .references(() => boardTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    role: integer("role").$type<Role>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    userIdIdx: index("members_user_id_index").on(table.userId),
    boardIdIdx: index("members_board_id_index").on(table.boardId),
    boardUserUnique: unique().on(table.boardId, table.userId),
  })
);

export const insertMemberSchema = createInsertSchema(memberTable);
export const selectMemberSchema = createSelectSchema(memberTable);
export type NewMember = typeof memberTable.$inferInsert;

export const voteTable = sqliteTable(
  "vote",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => userTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    postId: text("post_id")
      .references(() => postTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    boardId: text("board_id")
      .references(() => boardTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
  },
  (table) => ({
    compositeIdx: index("votes_composite_index").on(
      table.boardId,
      table.userId,
      table.postId
    ),
  })
);
