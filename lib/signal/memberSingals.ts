import type { Member, MemberSignal } from "@/lib/types/member";
import { signal } from "@preact/signals-react";

export const memberSignal = signal<MemberSignal[]>([]);

export const memberSignalInitial = (members: MemberSignal[]) => {
  memberSignal.value = members;
};

export const addMember = (newMember: MemberSignal) => {
  memberSignal.value = [...memberSignal.value, newMember];
};

export const removeMember = (memberId: Member["id"]) => {
  const index = memberSignal.value.findIndex(
    (member) => member.id === memberId
  );
  if (index !== -1) {
    memberSignal.value = [
      ...memberSignal.value.slice(0, index),
      ...memberSignal.value.slice(index + 1),
    ];
  }
};

export const updateMember = (updatedMember: MemberSignal) => {
  const index = memberSignal.value.findIndex(
    (member) => member.id === updatedMember.id
  );
  if (index !== -1) {
    memberSignal.value = [
      ...memberSignal.value.slice(0, index),
      updatedMember,
      ...memberSignal.value.slice(index + 1),
    ];
  }
};
