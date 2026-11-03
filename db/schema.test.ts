import * as schema from "@/db/schema";
import { db } from "@/lib/db/client";
import { checkMemberRole } from "@/lib/db/member";
import type * as TestDatabase from "@/tests/helpers/database";
import { pushSQLiteSchema } from "drizzle-kit/api";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

jest.mock("@/lib/db/client", () =>
  jest
    .requireActual<typeof TestDatabase>("@/tests/helpers/database")
    .createTestDatabase()
);

const client = db.$client;
const relationalDb = drizzle(client, { schema });
let sequence = 0;

async function createTeam() {
  const id = `team-${++sequence}`;
  await client.execute({
    sql: "INSERT INTO team (id, name) VALUES (?, 'Retrospective team')",
    args: [id],
  });
  return id;
}

beforeAll(async () => {
  // Apply the actual schema only to this temporary database; no migration files.
  const setup = await pushSQLiteSchema(schema, db);
  await setup.apply();
  await client.execute("PRAGMA foreign_keys = ON");
  await db.insert(schema.userTable).values({
    id: "team-user",
    name: "Team user",
    email: "team@example.invalid",
    supabase_id: "team-user",
  });
});

it("stores a team and defaults a new membership to member", async () => {
  const teamId = await createTeam();
  await client.execute({
    sql: "INSERT INTO team_member (id, team_id, user_id) VALUES (?, ?, 'team-user')",
    args: [teamId, teamId],
  });
  const { rows } = await client.execute({
    sql: "SELECT role, created_at FROM team_member WHERE team_id = ?",
    args: [teamId],
  });
  expect(rows).toEqual([
    expect.objectContaining({ role: "member", created_at: expect.any(Number) }),
  ]);
  const team = await client.execute({
    sql: "SELECT name, created_at, updated_at FROM team WHERE id = ?",
    args: [teamId],
  });
  expect(team.rows).toEqual([
    {
      name: "Retrospective team",
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
    },
  ]);
});

it("rejects duplicate memberships and unsupported team roles", async () => {
  const teamId = await createTeam();
  await client.execute({
    sql: "INSERT INTO team_member (id, team_id, user_id, role) VALUES (?, ?, 'team-user', 'owner')",
    args: [teamId, teamId],
  });
  await expect(
    client.execute({
      sql: "INSERT INTO team_member (id, team_id, user_id) VALUES (?, ?, 'team-user')",
      args: [`${teamId}-duplicate`, teamId],
    })
  ).rejects.toThrow(/UNIQUE/);
  await expect(
    client.execute({
      sql: "UPDATE team_member SET role = 'guest' WHERE team_id = ?",
      args: [teamId],
    })
  ).rejects.toThrow(/CHECK/);
});

it("rejects memberships with missing teams or users", async () => {
  const teamId = await createTeam();
  for (const [team, user] of [
    ["missing-team", "team-user"],
    [teamId, "missing-user"],
  ]) {
    await expect(
      client.execute({
        sql: "INSERT INTO team_member (id, team_id, user_id) VALUES (?, ?, ?)",
        args: [`${team}-${user}`, team, user],
      })
    ).rejects.toThrow(/FOREIGN KEY/);
  }
});

it("requires normalized invitation emails, unique team emails, and unique token hashes", async () => {
  const teamId = await createTeam();
  const otherTeamId = await createTeam();
  const insert = (id: string, team: string, email: string, tokenHash: string) =>
    client.execute({
      sql: "INSERT INTO team_invitation (id, team_id, email, token_hash, expires_at) VALUES (?, ?, ?, ?, 2000000000)",
      args: [id, team, email, tokenHash],
    });
  await insert(teamId, teamId, "invite@example.invalid", "a".repeat(64));
  await expect(
    insert(`${teamId}-email`, teamId, "invite@example.invalid", "b".repeat(64))
  ).rejects.toThrow(/UNIQUE/);
  await expect(
    insert(
      `${teamId}-hash`,
      otherTeamId,
      "other@example.invalid",
      "a".repeat(64)
    )
  ).rejects.toThrow(/UNIQUE/);
  await expect(
    insert(`${teamId}-case`, teamId, " Invite@Example.invalid ", "c".repeat(64))
  ).rejects.toThrow(/CHECK/);
  await insert(
    otherTeamId,
    otherTeamId,
    "invite@example.invalid",
    "d".repeat(64)
  );
});

it("keeps team-less private and Team-label boards valid", async () => {
  await db.insert(schema.boardTable).values([
    { id: "schema-private", title: "Private", state: 0 },
    {
      id: "schema-team-label",
      title: "Team label",
      state: 0,
      visibility: "team",
    },
  ]);
  const { rows } = await client.execute(
    "SELECT id, visibility, team_id FROM board WHERE id IN ('schema-private', 'schema-team-label') ORDER BY id"
  );
  expect(rows).toEqual([
    { id: "schema-private", visibility: "private", team_id: null },
    { id: "schema-team-label", visibility: "team", team_id: null },
  ]);
});

it("blocks deleting a team with boards and cascades memberships and invitations after its boards are removed", async () => {
  const teamId = await createTeam();
  await client.execute({
    sql: "INSERT INTO board (id, title, state, visibility, team_id) VALUES (?, 'Team board', 0, 'team', ?)",
    args: [teamId, teamId],
  });
  await client.execute({
    sql: "INSERT INTO team_member (id, team_id, user_id) VALUES (?, ?, 'team-user')",
    args: [teamId, teamId],
  });
  await client.execute({
    sql: "INSERT INTO team_invitation (id, team_id, email, token_hash, expires_at) VALUES (?, ?, 'delete@example.invalid', ?, 2000000000)",
    args: [teamId, teamId, "e".repeat(64)],
  });
  await expect(
    client.execute({ sql: "DELETE FROM team WHERE id = ?", args: [teamId] })
  ).rejects.toThrow(/FOREIGN KEY/);
  expect(
    (
      await client.execute({
        sql: "SELECT id FROM board WHERE id = ?",
        args: [teamId],
      })
    ).rows
  ).toEqual([{ id: teamId }]);
  expect(
    await relationalDb.query.boardTable.findFirst({
      where: eq(schema.boardTable.id, teamId),
      with: { team: true },
    })
  ).toMatchObject({ team: { id: teamId } });
  await client.execute({
    sql: "DELETE FROM board WHERE id = ?",
    args: [teamId],
  });
  await client.execute({
    sql: "DELETE FROM team WHERE id = ?",
    args: [teamId],
  });
  expect(
    (
      await client.execute({
        sql: "SELECT id FROM team_member WHERE team_id = ?",
        args: [teamId],
      })
    ).rows
  ).toEqual([]);
  expect(
    (
      await client.execute({
        sql: "SELECT id FROM team_invitation WHERE team_id = ?",
        args: [teamId],
      })
    ).rows
  ).toEqual([]);
});

it("loads team relations and retains invitations after deleting their inviter", async () => {
  const teamId = await createTeam();
  await db.insert(schema.userTable).values({
    id: "departing-user",
    name: "Departing user",
    email: "departing@example.invalid",
    supabase_id: "departing-user",
  });
  await db.insert(schema.teamMemberTable).values({
    id: teamId,
    teamId,
    userId: "departing-user",
    role: "owner",
  });
  await db.insert(schema.teamInvitationTable).values({
    id: teamId,
    teamId,
    email: "invited@example.invalid",
    tokenHash: "f".repeat(64),
    invitedBy: "departing-user",
    expiresAt: new Date("2030-01-01T00:00:00Z"),
  });
  const readTeam = () =>
    relationalDb.query.teamTable.findFirst({
      where: eq(schema.teamTable.id, teamId),
      with: {
        members: { with: { user: true } },
        invitations: { with: { inviter: true } },
      },
    });
  expect(await readTeam()).toMatchObject({
    members: [{ user: { id: "departing-user" } }],
    invitations: [{ inviter: { id: "departing-user" } }],
  });
  expect(
    await relationalDb.query.userTable.findFirst({
      where: eq(schema.userTable.id, "departing-user"),
      with: {
        teamMemberships: { with: { team: true } },
        teamInvitations: { with: { team: true } },
      },
    })
  ).toMatchObject({
    teamMemberships: [{ team: { id: teamId } }],
    teamInvitations: [{ team: { id: teamId } }],
  });
  await db
    .delete(schema.userTable)
    .where(eq(schema.userTable.id, "departing-user"));
  expect(await readTeam()).toMatchObject({
    members: [],
    invitations: [{ id: teamId, invitedBy: null, inviter: null }],
  });
});

it("does not grant board access to a team owner without direct board membership", async () => {
  const teamId = await createTeam();
  await db.insert(schema.teamMemberTable).values({
    id: teamId,
    teamId,
    userId: "team-user",
    role: "owner",
  });
  await db.insert(schema.boardTable).values({
    id: teamId,
    teamId,
    title: "Team board",
    state: 0,
    visibility: "team",
  });
  await expect(checkMemberRole("team-user", teamId)).resolves.toBeNull();
  await db.insert(schema.memberTable).values({
    id: teamId,
    boardId: teamId,
    userId: "team-user",
    role: 2,
  });
  await expect(checkMemberRole("team-user", teamId)).resolves.toBe(2);
});
