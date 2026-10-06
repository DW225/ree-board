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
  updateMemberRole,
} from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { Board } from "@/lib/types/board";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { logger } from "@/lib/utils/logger";
import { emailSchema } from "@/lib/utils/validation";
import { nanoid } from "nanoid";
import { z } from "zod";
import { actionWithAuth, rbacWithAuth } from "../actionWithAuth";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
const memberGrantSchema = z.object({
  userId: idSchema,
  role: z.union([z.literal(Role.member), z.literal(Role.guest)]),
});
const newMemberSchema = memberGrantSchema.extend({
  id: idSchema,
  boardId: idSchema,
});

export const findUserByEmailAction = async (
  email: User["email"],
  boardId: Board["id"]
) => {
  const data = z
    .object({ email: emailSchema, boardId: idSchema })
    .parse({ email, boardId });
  return rbacWithAuth(
    data.boardId,
    async (userId) => {
      logger.logAction("findUserByEmailAction", {
        userId,
        boardId: data.boardId,
      });
      const user = await findUserByEmail(data.email);
      return user ? { id: user.id, name: user.name } : null;
    },
    Role.owner
  );
};

export const addMemberToBoardAction = async (newMember: NewMember) => {
  const data = newMemberSchema.parse(newMember);
  return rbacWithAuth(
    data.boardId,
    async (userId) => {
      logger.logAction("addMemberToBoardAction", {
        userId,
        boardId: data.boardId,
        newMemberUserId: data.userId,
      });
      return addMember(data);
    },
    Role.owner
  );
};

export const removeMemberFromBoardAction = async (
  userId: User["id"],
  boardId: Board["id"]
) => {
  const data = z
    .object({ userId: idSchema, boardId: idSchema })
    .parse({ userId, boardId });
  return rbacWithAuth(
    data.boardId,
    async (authenticatedUserId) => {
      logger.logAction("removeMemberFromBoardAction", {
        userId: authenticatedUserId,
        boardId: data.boardId,
        removedUserId: data.userId,
      });
      return removeMember(data.userId, data.boardId);
    },
    Role.owner
  );
};

/** Returns expected role-change rejections as data for the client. */
export const updateMemberRoleAction = async (
  boardId: Board["id"],
  userId: User["id"],
  role: Role
) => {
  const data = z
    .object({ boardId: idSchema, userId: idSchema, role: z.enum(Role) })
    .parse({ boardId, userId, role });
  return rbacWithAuth(
    data.boardId,
    (authenticatedUserId) => {
      logger.logAction("updateMemberRoleAction", {
        userId: authenticatedUserId,
        boardId: data.boardId,
        updatedUserId: data.userId,
        role: data.role,
      });
      return updateMemberRole(
        data.userId,
        data.boardId,
        data.role,
        authenticatedUserId
      );
    },
    Role.owner
  );
};

export const getBoardsWhereUserIsAdminAction = async () =>
  actionWithAuth(async (userId) => {
    logger.logAction("getBoardsWhereUserIsAdminAction", { userId });
    return await fetchBoardsWhereUserIsAdmin(userId);
  });

export const getMembersFromBoardWithExclusionAction = async (
  boardId: Board["id"],
  excludeBoardId: Board["id"]
) => {
  const data = z
    .object({ boardId: idSchema, excludeBoardId: idSchema })
    .parse({ boardId, excludeBoardId });
  return rbacWithAuth(
    data.boardId,
    async () =>
      rbacWithAuth(
        data.excludeBoardId,
        async (userId) => {
          logger.logAction("getMembersFromBoardWithExclusionAction", {
            userId,
            ...data,
          });
          return fetchMembersWithExclude([data.boardId], data.excludeBoardId);
        },
        Role.owner
      ),
    Role.owner
  );
};

export const bulkImportMembersAction = async (
  targetBoardId: Board["id"],
  sourceBoardId: Board["id"],
  userIds: User["id"][]
) => {
  const data = z
    .object({
      targetBoardId: idSchema,
      sourceBoardId: idSchema,
      userIds: z.array(idSchema).max(1000),
    })
    .parse({ targetBoardId, sourceBoardId, userIds });
  return rbacWithAuth(
    data.targetBoardId,
    async () =>
      rbacWithAuth(
        data.sourceBoardId,
        async (userId) => {
          logger.logAction("bulkImportMembersAction", {
            userId,
            boardId: data.targetBoardId,
            sourceBoardId: data.sourceBoardId,
            memberCount: data.userIds.length,
          });

          const uniqueUserIds = [...new Set(data.userIds)];
          const totalMemberCount = uniqueUserIds.length;
          const importedMembers = await db.transaction(async (trx) => {
            const sourceMembers = await fetchMembersByBoardID(
              data.sourceBoardId,
              trx
            );
            const sourceByUserId = new Map(
              sourceMembers.map((member) => [member.userId, member])
            );
            const existingMembers = await fetchMembersByBoardID(
              data.targetBoardId,
              trx
            );
            if (
              sourceByUserId.get(userId)?.role !== Role.owner ||
              !existingMembers.some(
                (member) =>
                  member.userId === userId && member.role === Role.owner
              )
            ) {
              throw new Error("Board owner access is required.");
            }
            const selectedMembers = uniqueUserIds.map((selectedUserId) => {
              const member = sourceByUserId.get(selectedUserId);
              if (!member)
                throw new Error(
                  "Selected member is no longer on the source board."
                );
              return member;
            });
            const existingIds = new Set(existingMembers.map((m) => m.userId));
            const membersToAdd = selectedMembers
              .filter((m) => !existingIds.has(m.userId))
              .map((m) => ({
                id: nanoid(),
                userId: m.userId,
                boardId: data.targetBoardId,
                role: m.role,
              }));
            return bulkAddMembers(membersToAdd, trx);
          });

          return {
            imported: importedMembers.length,
            skipped: totalMemberCount - importedMembers.length,
            members: importedMembers,
          };
        },
        Role.owner
      ),
    Role.owner
  );
};
