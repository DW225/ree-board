import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

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
  (table) => [index("user_name_index").on(table.name)]
);

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
  (table) => [index("board_state_index").on(table.state)]
);

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
  (table) => [
    index("post_board_id_index").on(table.boardId),
    check("vote_count_check", sql`${table.voteCount} >= 0`),
  ]
);

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
  (table) => [
    index("members_user_id_index").on(table.userId),
    index("members_board_id_index").on(table.boardId),
    unique().on(table.boardId, table.userId),
  ]
);

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
  (table) => [
    index("votes_composite_index").on(
      table.boardId,
      table.userId,
      table.postId
    ),
    unique().on(table.boardId, table.userId, table.postId),
  ]
);

export enum TaskState {
  pending,
  inProgress,
  completed,
  cancelled,
}

export const taskTable = sqliteTable(
  "action",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
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
    state: integer("state")
      .$type<TaskState>()
      .notNull()
      .default(TaskState.pending),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [
    unique().on(table.boardId, table.userId, table.postId),
    index("actions_user_id_index").on(table.userId),
    index("actions_board_id_index").on(table.boardId),
  ]
);
