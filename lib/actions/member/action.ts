"use server";

import { Role } from "@/lib/constants/role";
import { fetchBoardsWhereUserIsAdmin } from "@/lib/db/board";
import { db } from "@/lib/db/client";
import {
  addMember,
  bulkAddMembers,
  fetchMembersByBoardID,
  fetchMembersWithExclude,
  removeMember,
} from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { Board } from "@/lib/types/board";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { logger } from "@/lib/utils/logger";
import { nanoid } from "nanoid";
import { actionWithAuth, rbacWithAuth } from "../actionWithAuth";

export const findUserByEmailAction = async (email: User["email"]) =>
  actionWithAuth(async (userId) => {
    logger.logAction("findUserByEmailAction", { userId });
    return findUserByEmail(email);
  });

export const addMemberToBoardAction = async (newMember: NewMember) =>
  rbacWithAuth(
    newMember.boardId,
    async (userId) => {
      logger.logAction("addMemberToBoardAction", {
        userId,
        boardId: newMember.boardId,
        newMemberUserId: newMember.userId,
      });
      return addMember(newMember);
    },
    Role.owner,
  );

export const removeMemberFromBoardAction = async (
  userId: User["id"],
  boardId: Board["id"],
) =>
  rbacWithAuth(
    boardId,
    async (authenticatedUserId) => {
      logger.logAction("removeMemberFromBoardAction", {
        userId: authenticatedUserId,
        boardId,
        removedUserId: userId,
      });
      return removeMember(userId, boardId);
    },
    Role.owner,
  );

export const getBoardsWhereUserIsAdminAction = async () =>
  actionWithAuth(async (userId) => {
    logger.logAction("getBoardsWhereUserIsAdminAction", { userId });
    return await fetchBoardsWhereUserIsAdmin(userId);
  });

export const getMembersFromBoardWithExclusionAction = async (
  boardId: Board["id"],
  excludeBoardId: Board["id"],
) =>
  rbacWithAuth(
    boardId,
    async (userId) => {
      logger.logAction("getMembersFromBoardWithExclusionAction", {
        userId,
        boardId,
        excludeBoardId,
      });
      return await fetchMembersWithExclude([boardId], excludeBoardId);
    },
    Role.guest,
  );

export const bulkImportMembersAction = async (
  targetBoardId: Board["id"],
  membersToImport: Array<{
    userId: User["id"];
    role: Role;
  }>,
) =>
  rbacWithAuth(
    targetBoardId,
    async (userId) => {
      logger.logAction("bulkImportMembersAction", {
        userId,
        boardId: targetBoardId,
        memberCount: membersToImport.length,
      });

      const totalMemberCount = membersToImport.length;
      let addMemberCount = 0;
      await db.transaction(async (trx) => {
        const existingMembers = await fetchMembersByBoardID(targetBoardId, trx);
        const existingIds = new Set(existingMembers.map((m) => m.userId));
        const membersToAdd = membersToImport
          .filter((m) => !existingIds.has(m.userId))
          .map((m) => ({
            id: nanoid(),
            userId: m.userId,
            boardId: targetBoardId,
            role: m.role,
          }));
        addMemberCount = membersToAdd.length;

        if (membersToAdd.length > 0) {
          await bulkAddMembers(membersToAdd, trx);
        }
      });

      return {
        imported: addMemberCount,
        skipped: totalMemberCount - addMemberCount,
      };
    },
    Role.owner,
  );
