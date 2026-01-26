import { boardTable, memberTable, userTable } from "@/db/schema";
import { Role } from "@/lib/constants/role";
import type { Board, NewBoard } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import { db } from "./client";
import { checkMemberRole } from "./member";

const prepareFetchBoardsByUserId = db
  .select({
    id: boardTable.id,
    title: boardTable.title,
    state: boardTable.state,
    creator: boardTable.creator,
    updatedAt: boardTable.updatedAt,
    createdAt: boardTable.createdAt,
    role: memberTable.role,
  })
  .from(boardTable)
  .innerJoin(memberTable, eq(boardTable.id, memberTable.boardId))
  .where(eq(memberTable.userId, sql.placeholder("userId")))
  .prepare();

export async function fetchBoards(userId: User["id"]) {
  invariant(userId, "User ID is required");
  return await prepareFetchBoardsByUserId.execute({ userId });
}

export async function createBoard(newBoard: NewBoard, userID: User["id"]) {
  return await db.transaction(async (tx) => {
    const [board] = await tx
      .insert(boardTable)
      .values({
        id: newBoard.id,
        title: newBoard.title,
        state: newBoard.state,
        creator: userID,
      })
      .returning({ id: boardTable.id });

    if (!board) {
      throw new Error("Failed to create board");
    }

    await tx.insert(memberTable).values({
      id: nanoid(),
      userId: userID,
      boardId: board.id,
      role: Role.owner,
    });

    return board.id;
  });
}

export async function deleteBoard(boardId: Board["id"], userId: User["id"]) {
  const role = await checkMemberRole(userId, boardId);

  if (role !== Role.owner) {
    throw new Error("Insufficient permissions to delete board");
  }

  try {
    await db.delete(boardTable).where(eq(boardTable.id, boardId)).execute();
  } catch (error) {
    console.error("Failed to delete board from database:", error);
    throw new Error("Failed to delete board");
  }

  // Return void - server actions don't need to return the DB result object
}

export async function updateBoard(
  boardId: Board["id"],
  updates: Partial<Pick<Board, "title" | "state">>,
  userId: User["id"],
) {
  const role = await checkMemberRole(userId, boardId);

  if (role !== Role.owner) {
    throw new Error("Insufficient permissions to update board");
  }

  try {
    await db
      .update(boardTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(boardTable.id, boardId))
      .execute();
  } catch (error) {
    console.error("Failed to update board in database:", error);
    throw new Error("Failed to update board");
  }

  // Return void - server actions don't need to return the DB result object
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
      eq(memberTable.role, Role.owner),
    ),
  )
  .prepare();

export async function fetchBoardsWhereUserIsAdmin(
  userId: User["id"],
): Promise<Board[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  return await prepareFetchBoardsWhereUserIsAdmin.execute({ userId });
}
