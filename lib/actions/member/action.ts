"use server";

import { Role } from "@/lib/constants/role";
import {
  addMember,
  bulkAddMembers,
  checkIfMemberExists,
  checkRoleByKindeID,
  fetchMembersFromMultipleBoards,
  removeMember,
} from "@/lib/db/member";
import { fetchBoardsWhereUserIsAdmin } from "@/lib/db/board";
import { findUserByEmail } from "@/lib/db/user";
import type { Board } from "@/lib/types/board";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { actionWithAuth } from "../actionWithAuth";

async function rbacWithAuth<T>(boardId: Board["id"], action: () => Promise<T>) {
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

  if (user.role === Role.guest) {
    console.warn("Access denied for guest role");
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return action();
}

export const authenticatedFindUserByEmail = async (email: User["email"]) =>
  actionWithAuth(() => findUserByEmail(email));

export const authenticatedAddMemberToBoard = async (newMember: NewMember) =>
  actionWithAuth(() => addMember(newMember));

export const authenticatedRemoveMemberFromBoard = async (
  userId: User["id"],
  boardId: Board["id"]
) => rbacWithAuth(boardId, () => removeMember(userId, boardId));

export const authenticatedGetBoardsWhereUserIsAdmin = async () =>
  actionWithAuth(async () => {
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser?.id) {
      throw new Error("User not authenticated");
    }

    return await fetchBoardsWhereUserIsAdmin(kindeUser.id);
  });

export const authenticatedGetMembersFromBoards = async (
  boardIds: Board["id"][],
  excludeBoardId?: Board["id"]
) =>
  actionWithAuth(() =>
    fetchMembersFromMultipleBoards(boardIds, excludeBoardId)
  );

export const authenticatedBulkImportMembers = async (
  targetBoardId: Board["id"],
  membersToImport: Array<{
    userId: User["id"];
    role: Role;
  }>
) =>
  rbacWithAuth(targetBoardId, async () => {
    // Filter out members that already exist in the target board
    const membersToAdd = [];

    for (const member of membersToImport) {
      const exists = await checkIfMemberExists(member.userId, targetBoardId);
      if (!exists) {
        membersToAdd.push({
          id: nanoid(),
          userId: member.userId,
          boardId: targetBoardId,
          role: member.role,
        });
      }
    }

    if (membersToAdd.length > 0) {
      await bulkAddMembers(membersToAdd);
    }

    return {
      imported: membersToAdd.length,
      skipped: membersToImport.length - membersToAdd.length,
    };
  });
