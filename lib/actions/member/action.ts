"use server";

import { addMember, removeMember } from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { Board } from "@/lib/types/board";
import type { NewMember } from "@/lib/types/member";
import type { User } from "@/lib/types/user";
import { actionWithAuth } from "../actionWithAuth";

export const authenticatedFindUserByEmail = async (email: User["email"]) =>
  actionWithAuth(() => findUserByEmail(email));

export const authenticatedAddMemberToBoard = async (newMember: NewMember) =>
  actionWithAuth(() => addMember(newMember));

export const authenticatedRemoveMemberFromBoard = async (
  userId: User["id"],
  boardId: Board["id"]
) => actionWithAuth(() => removeMember(userId, boardId));
