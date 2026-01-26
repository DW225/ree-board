"use server";

import { Role } from "@/lib/constants/role";
import { createBoard, deleteBoard, updateBoard } from "@/lib/db/board";
import { addMember } from "@/lib/db/member";
import type { Board, NewBoard } from "@/lib/types/board";
import { boardTitleSchema, emailListSchema } from "@/lib/utils/validation";
import { actionWithAuth, rbacWithAuth } from "../actionWithAuth";
import { nanoid } from "nanoid";
import type { User } from "@/lib/types/user";
import { findUserByEmail } from "@/lib/db/user";

export const createBoardAction = async (
  board: NewBoard,
  membersEmails: User["email"][],
) =>
  actionWithAuth(async (userId) => {
    // Server-side validation
    const validatedTitle = boardTitleSchema.parse(board.title);
    const validatedEmails = emailListSchema.parse(membersEmails);

    const boardID = await createBoard(
      {
        ...board,
        title: validatedTitle,
        creator: userId,
      },
      userId,
    );

    // Add members to the board
    await Promise.all(
      validatedEmails.map(async (email) => {
        const user = await findUserByEmail(email);
        if (user) {
          return addMember({
            id: nanoid(),
            userId: user.id,
            boardId: boardID,
            role: Role.member,
          });
        }
      }),
    );

    return boardID;
  });

export const deleteBoardAction = async (boardId: Board["id"]) =>
  rbacWithAuth(
    boardId,
    async (userId) => {
      return deleteBoard(boardId, userId);
    },
    Role.owner,
  );

export const updateBoardTitleAction = async (
  boardId: Board["id"],
  title: string,
) =>
  rbacWithAuth(
    boardId,
    async (userId) => {
      // Server-side validation
      const validatedTitle = boardTitleSchema.parse(title);
      return updateBoard(boardId, { title: validatedTitle }, userId);
    },
    Role.owner,
  );
