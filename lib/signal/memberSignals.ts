import type { Member, MemberSignal } from "@/lib/types/member";
import { signal } from "@preact/signals-react";

export const membersSignal = signal<MemberSignal[]>([]);

export const initializeMemberSignals = (members: MemberSignal[]) => {
  membersSignal.value = members;
};

export const addMember = (newMember: MemberSignal) => {
  membersSignal.value = [...membersSignal.value, newMember];
};

export const removeMember = (memberId: Member["id"]) => {
  membersSignal.value = membersSignal.value.filter(
    (member) => member.id !== memberId
  );
};

export const updateMemberRole = (
  memberId: Member["id"],
  role: Member["role"]
) => {
  membersSignal.value = membersSignal.value.map((member) =>
    member.id === memberId ? { ...member, role } : member
  );
};

// Legacy aliases still used by the board UI and local transport.
export const memberSignalInitial = initializeMemberSignals;
export const memberSignal = membersSignal;
