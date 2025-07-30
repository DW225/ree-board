import { boardTable, memberTable, userTable } from "@/db/schema";
import { Role } from "@/lib/constants/role";
import type { Board } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import { addMember, checkMemberRole } from "./member";

const prepareFetchBoardsByKindeId = db
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
  .where(eq(userTable.kinde_id, sql.placeholder("kindeId")))
  .prepare();

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
  .where(eq(boardTable.creator, sql.placeholder("userId")))
  .prepare();

export async function fetchBoards(
  userId: User["id"] | User["kinde_id"],
  useKindeId: boolean = true
) {
  if (userId === null) {
    throw new Error("User ID is required");
  }
  if (useKindeId) {
    return await prepareFetchBoardsByKindeId.execute({ kindeId: userId });
  } else {
    return await prepareFetchBoardsByUserId.execute({ userId });
  }
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
      eq(userTable.kinde_id, sql.placeholder("kindeId")),
      eq(memberTable.role, Role.owner)
    )
  )
  .prepare();

export async function fetchBoardsWhereUserIsAdmin(
  kindeId: User["kinde_id"]
): Promise<Board[]> {
  if (!kindeId) {
    throw new Error("Kinde ID is required");
  }

  return await prepareFetchBoardsWhereUserIsAdmin.execute({ kindeId });
}
