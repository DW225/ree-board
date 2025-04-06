"use server";

import { createBoard } from "@/lib/db/board";
import type { NewBoard } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import { actionWithAuth } from "../actionWithAuth";

export const createBoardAction = async (board: NewBoard, userId: User["id"]) =>
  actionWithAuth(() =>
    createBoard(
      {
        ...board,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: userId,
      },
      userId
    )
  );
