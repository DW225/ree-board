import { boardTable, memberTable, userTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { Transaction } from "@/lib/types/db";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { and, eq, inArray, ne, notExists, sql } from "drizzle-orm";
import { db } from "./client";

export const addMember = async (newMember: NewMember) => {
  await db.insert(memberTable).values({
    id: newMember.id,
    userId: newMember.userId,
    boardId: newMember.boardId,
    role: newMember.role,
  });
};

export const removeMember = async (
  userID: User["id"],
  boardId: Board["id"]
) => {
  await db
    .delete(memberTable)
    .where(
      and(eq(memberTable.userId, userID), eq(memberTable.boardId, boardId))
    );
};

const prepareFetchMembersByBoardID = db
  .select({
    id: memberTable.id,
    userId: memberTable.userId,
    role: memberTable.role,
    username: userTable.name,
    email: userTable.email,
    updatedAt: memberTable.updatedAt,
  })
  .from(memberTable)
  .innerJoin(userTable, eq(memberTable.userId, userTable.id))
  .where(eq(memberTable.boardId, sql.placeholder("boardId")))
  .prepare();

export const fetchMembersByBoardID = async (
  boardId: Board["id"],
  trx?: Transaction
) => {
  if (trx) {
    return await trx
      .select({
        id: memberTable.id,
        userId: memberTable.userId,
        role: memberTable.role,
        username: userTable.name,
        email: userTable.email,
        updateAt: memberTable.updatedAt,
      })
      .from(memberTable)
      .innerJoin(userTable, eq(memberTable.userId, userTable.id))
      .where(eq(memberTable.boardId, boardId));
  }
  return await prepareFetchMembersByBoardID.execute({ boardId });
};

const prepareCheckMemberRole = db
  .select({
    role: memberTable.role,
  })
  .from(memberTable)
  .where(
    and(
      eq(memberTable.userId, sql.placeholder("userId")),
      eq(memberTable.boardId, sql.placeholder("boardId"))
    )
  )
  .prepare();

export const checkMemberRole = async (
  userID: User["id"],
  boardId: Board["id"]
) => {
  const member = await prepareCheckMemberRole.execute({ 
    userId: userID, 
    boardId 
  });
  return member ? member[0].role : null;
};

const prepareCheckRoleByKindeID = db
  .select({
    role: memberTable.role,
    userID: userTable.id,
  })
  .from(memberTable)
  .innerJoin(userTable, eq(memberTable.userId, userTable.id))
  .where(
    and(
      eq(userTable.kinde_id, sql.placeholder("kindeId")),
      eq(memberTable.boardId, sql.placeholder("boardId"))
    )
  )
  .prepare();

export const checkRoleByKindeID = async (
  kindeID: User["kinde_id"],
  boardId: Board["id"]
) => {
  const member = await prepareCheckRoleByKindeID.execute({ 
    kindeId: kindeID, 
    boardId 
  });
  return member ? member[0] : null;
};

export const fetchMembersWithExclude = async (
  boardIds: Board["id"][],
  excludeBoardId: Board["id"]
) => {
  if (boardIds.length === 0) return [];

  const excludedMembers = db
    .select({ userId: memberTable.userId })
    .from(memberTable)
    .where(eq(memberTable.boardId, excludeBoardId))
    .as("excludedMembers");

  const whereConditions = and(
    inArray(memberTable.boardId, boardIds),
    ne(memberTable.boardId, excludeBoardId),
    notExists(
      db
        .select()
        .from(excludedMembers)
        .where(eq(excludedMembers.userId, memberTable.userId))
    )
  );

  return await db
    .select({
      id: memberTable.id,
      userId: memberTable.userId,
      role: memberTable.role,
      username: userTable.name,
      email: userTable.email,
      boardId: memberTable.boardId,
      boardTitle: boardTable.title,
    })
    .from(memberTable)
    .innerJoin(userTable, eq(memberTable.userId, userTable.id))
    .innerJoin(boardTable, eq(memberTable.boardId, boardTable.id))
    .where(whereConditions);
};

export const bulkAddMembers = async (
  members: NewMember[],
  trx?: Transaction
) => {
  if (members.length === 0) return;

  if (trx) {
    await trx.insert(memberTable).values(members).onConflictDoNothing();
  } else {
    await db.insert(memberTable).values(members).onConflictDoNothing();
  }
};

const prepareCheckIfMemberExists = db
  .select({ id: memberTable.id })
  .from(memberTable)
  .where(
    and(
      eq(memberTable.userId, sql.placeholder("userId")),
      eq(memberTable.boardId, sql.placeholder("boardId"))
    )
  )
  .limit(1)
  .prepare();

export const checkIfMemberExists = async (
  userId: User["id"],
  boardId: Board["id"]
): Promise<boolean> => {
  const existing = await prepareCheckIfMemberExists.execute({ 
    userId, 
    boardId 
  });

  return existing.length > 0;
};
