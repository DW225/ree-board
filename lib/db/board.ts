import type { Board } from "@/db/schema";
import { boardTable, memberTable, Role, userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { addMember, checkMemberRole } from "./member";
import { findUserIdByKindeID } from "./user";
import { nanoid } from "nanoid";

export async function fetchBoards(userId: string, useKindeId: boolean = true) {
  if (userId === null) {
    throw new Error("User ID is required");
  }
  if (useKindeId) {
    // Fetch boards by Kinde ID
    return await db
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
      .where(eq(userTable.kinde_id, userId));
  } else {
    // Fetch boards by user ID
    return await db
      .select({
        id: boardTable.id,
        title: boardTable.title,
        state: boardTable.state,
        creator: boardTable.creator,
        updatedAt: boardTable.updatedAt,
        createdAt: boardTable.createdAt,
      })
      .from(boardTable)
      .where(eq(userTable.id, userId));
  }
}

export async function createBoard(newBoard: Board, kindeId: string) {
  const userId = await findUserIdByKindeID(kindeId);
  if (userId === null) {
    throw new Error("User not found");
  }
  const board = await db
    .insert(boardTable)
    .values({
      id: newBoard.id,
      title: newBoard.title,
      state: newBoard.state,
      creator: userId,
    })
    .returning({ id: boardTable.id })
    .execute();
  if (board.length > 0) {
    await addMember({
      id: nanoid(),
      userId: userId,
      boardId: board[0].id,
      role: Role.owner,
    });
    return board[0].id;
  } else {
    throw new Error("Failed to create board");
  }
}

export async function deleteBoard(boardId: string, userId: string) {
  const role = await checkMemberRole(userId, boardId);

  if (role === Role.owner) {
    return await db
     .delete(boardTable)
     .where(eq(boardTable.id, boardId))
     .execute();
  }
  return new Error("Insufficient permissions to delete board");
}
