"use server";

import { hasRequiredRole, Role } from "@/lib/constants/role";
import { fetchBoardsWhereUserIsAdmin } from "@/lib/db/board";
import { db } from "@/lib/db/client";
import {
  addMember,
  bulkAddMembers,
  checkRoleByKindeID,
  fetchMembersByBoardID,
  fetchMembersWithExclude,
  removeMember,
} from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { Board } from "@/lib/types/board";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { actionWithAuth } from "../actionWithAuth";

async function rbacWithAuth<T>(
  boardId: Board["id"],
  minRole: Role,
  action: () => Promise<T>
) {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const kindeUser = await getUser();
  const kindeID = kindeUser?.id;

  if (!isAuthenticated || !kindeID) {
    console.warn("Not authenticated");
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const user = await checkRoleByKindeID(kindeID, boardId);

  if (!user) {
    console.warn("User not found");
    redirect("/");
  }

  if (!hasRequiredRole(user.role, minRole)) {
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
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser?.id) {
      throw new Error("User not authenticated");
    }

    return await fetchBoardsWhereUserIsAdmin(kindeUser.id);
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
