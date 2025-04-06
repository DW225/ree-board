"use server";

import { Role } from "@/lib/constants/role";
import { addMember, checkRoleByKindeID, removeMember } from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { Board } from "@/lib/types/board";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
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
