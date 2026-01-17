"use server";

import { hasRequiredRole, Role } from "@/lib/constants/role";
import { fetchBoardsWhereUserIsAdmin } from "@/lib/db/board";
import { db } from "@/lib/db/client";
import {
  addMember,
  bulkAddMembers,
  checkMemberRole,
  fetchMembersByBoardID,
  fetchMembersWithExclude,
  removeMember,
} from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { Board } from "@/lib/types/board";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { verifySession } from "@/lib/dal";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { actionWithAuth } from "../actionWithAuth";

async function rbacWithAuth<T>(
  boardId: Board["id"],
  minRole: Role,
  action: () => Promise<T>
) {
  // Verify session using centralized DAL
  const session = await verifySession();

  const role = await checkMemberRole(session.userId, boardId);

  if (role === null) {
    console.warn("User not a member of this board");
    redirect("/");
  }

  if (!hasRequiredRole(role, minRole)) {
    console.warn("User does not have sufficient role to perform this action");
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return action();
}

export const findUserByEmailAction = async (email: User["email"]) =>
  actionWithAuth(() => findUserByEmail(email));

export const addMemberToBoardAction = async (newMember: NewMember) =>
  rbacWithAuth(newMember.boardId, Role.owner, () => addMember(newMember));

export const removeMemberFromBoardAction = async (
  userId: User["id"],
  boardId: Board["id"]
) => rbacWithAuth(boardId, Role.owner, () => removeMember(userId, boardId));

export const getBoardsWhereUserIsAdminAction = async () =>
  actionWithAuth(async () => {
    const session = await verifySession();
    return await fetchBoardsWhereUserIsAdmin(session.userId);
  });

export const getMembersFromBoardWithExclusionAction = async (
  boardId: Board["id"],
  excludeBoardId: Board["id"]
) =>
  rbacWithAuth(
    boardId,
    Role.guest,
    async () => await fetchMembersWithExclude([boardId], excludeBoardId)
  );

export const bulkImportMembersAction = async (
  targetBoardId: Board["id"],
  membersToImport: Array<{
    userId: User["id"];
    role: Role;
  }>
) =>
  rbacWithAuth(targetBoardId, Role.owner, async () => {
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
  });
