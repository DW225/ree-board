import type { Board, NewMember, User } from "@/db/schema";
import { memberTable, userTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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
  boardID: Board["id"]
) => {
  await db
    .delete(memberTable)
    .where(
      and(eq(memberTable.userId, userID), eq(memberTable.boardId, boardID))
    )
    .execute();
};

export const fetchMembersByBoardID = async (boardID: Board["id"]) => {
  return await db
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
    .where(eq(memberTable.boardId, boardID));
};

export const checkMemberRole = async (
  userID: User["id"],
  boardID: Board["id"]
) => {
  const member = await db
    .select()
    .from(memberTable)
    .where(
      and(eq(memberTable.userId, userID), eq(memberTable.boardId, boardID))
    );
  return member ? member[0].role : null;
};
