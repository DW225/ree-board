import type { BoardState } from "@/lib/constants/board";
import { BOARD_VISIBILITIES } from "@/lib/constants/board";
import type { PostType } from "@/lib/constants/post";
import type { Role } from "@/lib/constants/role";
import { TaskState } from "@/lib/constants/task";
import { TEAM_ROLES } from "@/lib/constants/team";
import { relations, sql } from "drizzle-orm";
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
    email: text("email").notNull().unique(),
    supabase_id: text("supabase_id").notNull().unique(),
    isGuest: integer("is_guest", { mode: "boolean" }).default(false),
    guestExpiresAt: integer("guest_expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [index("user_name_index").on(table.name)]
);

export const teamTable = sqliteTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const teamMemberTable = sqliteTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teamTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: text("role", { enum: TEAM_ROLES }).notNull().default("member"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [
    unique("team_members_team_user_unique").on(table.teamId, table.userId),
    index("team_members_user_id_index").on(table.userId),
    check(
      "team_members_role_check",
      sql`${table.role} in (${sql.join(
        TEAM_ROLES.map((role) => sql`${role}`),
        sql`, `
      )})`.inlineParams()
    ),
  ]
);

export const teamInvitationTable = sqliteTable(
  "team_invitation",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teamTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by").references(() => userTable.id, {
      onDelete: "set null",
    }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [
    unique("team_invitations_team_email_unique").on(table.teamId, table.email),
    index("team_invitations_invited_by_index").on(table.invitedBy),
    check(
      "team_invitations_email_normalized_check",
      sql`${table.email} = lower(trim(${table.email}))`
    ),
  ]
);

export const boardTable = sqliteTable(
  "board",
  {
    id: text("id").primaryKey(), // Use Nano ID for primary key
    title: text("title").notNull(),
    description: text("description"),
    visibility: text("visibility", { enum: BOARD_VISIBILITIES })
      .notNull()
      .default("private"),
    // shortcut: require a team for Team boards when the forms support team selection.
    teamId: text("team_id").references(() => teamTable.id, {
      onDelete: "restrict",
    }),
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
  (table) => [
    index("board_state_index").on(table.state),
    index("board_team_id_index").on(table.teamId),
  ]
);

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

export const linksTable = sqliteTable(
  "links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    boardId: text("board_id")
      .references(() => boardTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    token: text("token").notNull().unique(), // Unique nano ID token
    role: integer("role").$type<Role>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    creator: text("creator").references(() => userTable.id, {
      onDelete: "set null",
    }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
  },
  (table) => [index("links_board_id_index").on(table.boardId)]
);

export const teamRelations = relations(teamTable, ({ many }) => ({
  members: many(teamMemberTable),
  invitations: many(teamInvitationTable),
  boards: many(boardTable),
}));

export const teamMemberRelations = relations(teamMemberTable, ({ one }) => ({
  team: one(teamTable, {
    fields: [teamMemberTable.teamId],
    references: [teamTable.id],
  }),
  user: one(userTable, {
    fields: [teamMemberTable.userId],
    references: [userTable.id],
  }),
}));

export const teamInvitationRelations = relations(
  teamInvitationTable,
  ({ one }) => ({
    team: one(teamTable, {
      fields: [teamInvitationTable.teamId],
      references: [teamTable.id],
    }),
    inviter: one(userTable, {
      fields: [teamInvitationTable.invitedBy],
      references: [userTable.id],
    }),
  })
);

export const boardRelations = relations(boardTable, ({ one }) => ({
  team: one(teamTable, {
    fields: [boardTable.teamId],
    references: [teamTable.id],
  }),
}));

export const userRelations = relations(userTable, ({ many }) => ({
  teamMemberships: many(teamMemberTable),
  teamInvitations: many(teamInvitationTable),
}));
