"use server";

import { Role } from "@/lib/constants/role";
import { createBoard, deleteBoard, updateBoard } from "@/lib/db/board";
import { addMember } from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { Board, NewBoard } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import {
  boardDetailsSchema,
  boardIdSchema,
  boardTitleSchema,
  boardVisibilitySchema,
  emailListSchema,
} from "@/lib/utils/validation";
import { nanoid } from "nanoid";
import { actionWithAuth, rbacWithAuth } from "../actionWithAuth";

export const createBoardAction = async (
  board: NewBoard,
  membersEmails: User["email"][]
) =>
  actionWithAuth(async (userId) => {
    // Validate client-supplied board ID format
    boardIdSchema.parse(board.id);

    // Server-side validation
    const validatedTitle = boardTitleSchema.parse(board.title);
    const validatedVisibility = boardVisibilitySchema
      .optional()
      .parse(board.visibility);
    const validatedEmails = emailListSchema.parse(membersEmails);

    const boardID = await createBoard(
      {
        ...board,
        title: validatedTitle,
        visibility: validatedVisibility,
        creator: userId,
      },
      userId
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
      })
    );

    return boardID;
  });

export const deleteBoardAction = async (boardId: Board["id"]) =>
  rbacWithAuth(
    boardId,
    async (userId) => {
      return deleteBoard(boardId, userId);
    },
    Role.owner
  );

export const updateBoardAction = async (
  boardId: Board["id"],
  details: Partial<Pick<Board, "title" | "description" | "visibility">>
) =>
  rbacWithAuth(
    boardIdSchema.parse(boardId),
    async (userId) => {
      return updateBoard(boardId, boardDetailsSchema.parse(details), userId);
    },
    Role.owner
  );
