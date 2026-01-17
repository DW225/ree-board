import { boardTable, memberTable, userTable } from "@/db/schema";
import { Role } from "@/lib/constants/role";
import type { Board } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import { db } from "./client";
import { addMember, checkMemberRole } from "./member";

const prepareFetchBoardsByUserId = db
  .select({
    id: boardTable.id,
    title: boardTable.title,
    state: boardTable.state,
    creator: boardTable.creator,
    updatedAt: boardTable.updatedAt,
    createdAt: boardTable.createdAt,
  })
  .from(boardTable)
  .innerJoin(memberTable, eq(boardTable.id, memberTable.boardId))
  .where(eq(memberTable.userId, sql.placeholder("userId")))
  .prepare();

export async function fetchBoards(userId: User["id"]) {
  invariant(userId, "User ID is required");
  return await prepareFetchBoardsByUserId.execute({ userId });
}

export async function createBoard(newBoard: Board, userID: User["id"]) {
  const board = await db
    .insert(boardTable)
    .values({
      id: newBoard.id,
      title: newBoard.title,
      state: newBoard.state,
      creator: userID,
    })
    .returning({ id: boardTable.id })
    .execute();
  if (board.length > 0) {
    await addMember({
      id: nanoid(),
      userId: userID,
      boardId: board[0].id,
      role: Role.owner,
    });
    return board[0].id;
  } else {
    throw new Error("Failed to create board");
  }
}

export async function deleteBoard(boardId: Board["id"], userId: User["id"]) {
  const role = await checkMemberRole(userId, boardId);

  if (role === Role.owner) {
    return await db
      .delete(boardTable)
      .where(eq(boardTable.id, boardId))
      .execute();
  }
  return new Error("Insufficient permissions to delete board");
}

const prepareFetchBoardsWhereUserIsAdmin = db
  .select({
    id: boardTable.id,
    title: boardTable.title,
    state: boardTable.state,
    creator: boardTable.creator,
    updatedAt: boardTable.updatedAt,
    createdAt: boardTable.createdAt,
  })
  .from(boardTable)
  .innerJoin(memberTable, eq(boardTable.id, memberTable.boardId))
  .innerJoin(userTable, eq(memberTable.userId, userTable.id))
  .where(
    and(
      eq(userTable.id, sql.placeholder("userId")),
      eq(memberTable.role, Role.owner)
    )
  )
  .prepare();

export async function fetchBoardsWhereUserIsAdmin(
  userId: User["id"]
): Promise<Board[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  return await prepareFetchBoardsWhereUserIsAdmin.execute({ userId });
}
