import type { MemberInfo } from "@/components/board/MemberManageModalComponent";
import { signal } from "@preact/signals-react";

export const memberSignal = signal<MemberInfo[]>([]);

export const memberSignalInitial = (members: MemberInfo[]) => {
  memberSignal.value = members;
}

export const addMember = (newMember: MemberInfo) => {
  memberSignal.value = [...memberSignal.value, newMember];
}

export const removeMember = (memberId: string) => {
  const index = memberSignal.value.findIndex((member) => member.id === memberId);
  if (index!== -1) {
    memberSignal.value = [
     ...memberSignal.value.slice(0, index),
     ...memberSignal.value.slice(index + 1),
    ];
  }
}

export const updateMember = (updatedMember: MemberInfo) => {
  const index = memberSignal.value.findIndex((member) => member.id === updatedMember.id);
  if (index!== -1) {
    memberSignal.value = [
     ...memberSignal.value.slice(0, index),
      updatedMember,
     ...memberSignal.value.slice(index + 1),
    ];
  }
}
