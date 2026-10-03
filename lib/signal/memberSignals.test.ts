import { afterEach, expect, it } from "@jest/globals";
import { Role } from "@/lib/constants/role";
import type { MemberSignal } from "@/lib/types/member";
import {
  addMember,
  initializeMemberSignals,
  memberSignal,
  memberSignalInitial,
  membersSignal,
  removeMember,
} from "./memberSignals";

afterEach(() => {
  initializeMemberSignals([]);
});

it("keeps member consumers in sync through initialization, addition, and removal", () => {
  const owner: MemberSignal = {
    id: "owner-membership",
    userId: "owner-user",
    role: Role.owner,
    username: "Owner",
    email: "owner@example.invalid",
  };
  const guest: MemberSignal = {
    id: "guest-membership",
    userId: "guest-user",
    role: Role.guest,
    username: "Guest",
    email: "guest@example.invalid",
  };

  initializeMemberSignals([owner]);
  expect(memberSignal.value).toEqual([owner]);
  addMember(guest);
  expect(memberSignal.value).toEqual([owner, guest]);
  removeMember(owner.id);
  expect(memberSignal.value).toEqual([guest]);
  expect(membersSignal.value).toEqual([guest]);
  memberSignalInitial([owner]);
  expect(membersSignal.value).toEqual([owner]);
  expect(memberSignal.value).toEqual([owner]);
});
