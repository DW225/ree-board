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
  membersToImport: Array<{
    userId: User["id"];
    role: Role;
  }>
) => {
  const data = z
    .object({
      targetBoardId: idSchema,
      membersToImport: z.array(memberGrantSchema).max(1000),
    })
    .parse({ targetBoardId, membersToImport });
  return rbacWithAuth(
    data.targetBoardId,
    async (userId) => {
      logger.logAction("bulkImportMembersAction", {
        userId,
        boardId: data.targetBoardId,
        memberCount: data.membersToImport.length,
      });

      const seenIds = new Set<string>();
      const uniqueMembers = data.membersToImport.filter((member) => {
        if (seenIds.has(member.userId)) return false;
        seenIds.add(member.userId);
        return true;
      });
      const totalMemberCount = uniqueMembers.length;
      let addMemberCount = 0;
      await db.transaction(async (trx) => {
        const existingMembers = await fetchMembersByBoardID(
          data.targetBoardId,
          trx
        );
        const existingIds = new Set(existingMembers.map((m) => m.userId));
        const membersToAdd = uniqueMembers
          .filter((m) => !existingIds.has(m.userId))
          .map((m) => ({
            id: nanoid(),
            userId: m.userId,
            boardId: data.targetBoardId,
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
    Role.owner
  );
};
