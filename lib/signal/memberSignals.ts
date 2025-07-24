import type { Member, MemberSignal } from "@/lib/types/member";
import type { SortDirection } from "@/lib/types/sort";
import { Role } from "@/lib/constants/role";
import { batch, computed, signal } from "@preact/signals-react";

// Core data signal - single source of truth
export const membersSignal = signal<MemberSignal[]>([]);

// UI state signals
export const memberSortCriteriaSignal = signal<{
  criterion: "username" | "email" | "role";
  direction: SortDirection;
}>({
  criterion: "username",
  direction: "asc",
});

export const memberFilterSignal = signal<string>("");
export const memberRoleFilterSignal = signal<Role | "">("");

// Computed signals for derived state
export const filteredMembersSignal = computed(() => {
  const members = membersSignal.value;
  const nameFilter = memberFilterSignal.value.toLowerCase();
  const roleFilter = memberRoleFilterSignal.value;

  return members.filter((member) => {
    const matchesName =
      !nameFilter ||
      member.username.toLowerCase().includes(nameFilter) ||
      member.email.toLowerCase().includes(nameFilter);
    const matchesRole = roleFilter === "" || member.role === roleFilter;
    return matchesName && matchesRole;
  });
});

export const sortedMembersSignal = computed(() => {
  const members = filteredMembersSignal.value;
  const { criterion, direction } = memberSortCriteriaSignal.value;

  const sortedMembers = [...members].sort((a, b) => {
    let comparison = 0;

    switch (criterion) {
      case "username":
        comparison = a.username.localeCompare(b.username);
        break;
      case "email":
        comparison = a.email.localeCompare(b.email);
        break;
      case "role": {
        // Sort by role hierarchy (owner first, then member, then guest)
        comparison = a.role - b.role;
        break;
      }
      default:
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sortedMembers;
});

// Computed signals for member statistics
export const memberStatsSignal = computed(() => {
  const members = membersSignal.value;
  const stats = members.reduce(
    (acc, member) => {
      const roleName = Role[member.role];
      acc.byRole[roleName] = (acc.byRole[roleName] || 0) + 1;
      acc.total++;
      return acc;
    },
    {
      total: 0,
      byRole: {} as Record<string, number>,
    }
  );

  return stats;
});

// Computed signal for members by role
export const membersByRoleSignal = computed(() => {
  const members = membersSignal.value;
  return members.reduce((acc, member) => {
    const role = member.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(member);
    return acc;
  }, {} as Record<Role, MemberSignal[]>);
});

// Initialization function
export const initializeMemberSignals = (members: MemberSignal[]) => {
  membersSignal.value = members;
};

// Action creators for member operations
export const addMember = (newMember: MemberSignal) => {
  membersSignal.value = [...membersSignal.value, newMember];
};

export const removeMember = (memberId: Member["id"]) => {
  membersSignal.value = membersSignal.value.filter(
    (member) => member.id !== memberId
  );
};

export const updateMember = (updatedMember: MemberSignal) => {
  membersSignal.value = membersSignal.value.map((member) =>
    member.id === updatedMember.id ? updatedMember : member
  );
};

export const updateMemberRole = (memberId: Member["id"], newRole: Role) => {
  membersSignal.value = membersSignal.value.map((member) =>
    member.id === memberId ? { ...member, role: newRole } : member
  );
};

export const updateMemberUsername = (
  memberId: Member["id"],
  newUsername: string
) => {
  membersSignal.value = membersSignal.value.map((member) =>
    member.id === memberId ? { ...member, username: newUsername } : member
  );
};

export const updateMemberEmail = (memberId: Member["id"], newEmail: string) => {
  membersSignal.value = membersSignal.value.map((member) =>
    member.id === memberId ? { ...member, email: newEmail } : member
  );
};

// Bulk operations with batch
export const addMultipleMembers = (newMembers: MemberSignal[]) => {
  batch(() => {
    membersSignal.value = [...membersSignal.value, ...newMembers];
  });
};

export const removeMultipleMembers = (memberIds: Member["id"][]) => {
  batch(() => {
    membersSignal.value = membersSignal.value.filter(
      (member) => !memberIds.includes(member.id)
    );
  });
};

// Sorting and filtering operations
export const sortMembers = (
  criterion: "username" | "email" | "role",
  direction?: SortDirection
) => {
  memberSortCriteriaSignal.value = {
    criterion,
    direction: direction ?? "asc",
  };
};

export const filterMembers = (filter: string) => {
  memberFilterSignal.value = filter;
};

export const filterMembersByRole = (roleFilter: Role | "") => {
  memberRoleFilterSignal.value = roleFilter;
};

// Utility functions
export const getMemberById = (memberId: Member["id"]) => {
  return membersSignal.value.find((member) => member.id === memberId);
};

export const getMembersByRole = (role: Role) => {
  return membersSignal.value.filter((member) => member.role === role);
};

export const getOwners = () => getMembersByRole(Role.owner);
export const getRegularMembers = () => getMembersByRole(Role.member);
export const getGuests = () => getMembersByRole(Role.guest);

// Legacy compatibility (deprecated - use initializeMemberSignals instead)
export const memberSignalInitial = initializeMemberSignals;

// Legacy compatibility (deprecated - use membersSignal instead)
export const memberSignal = membersSignal;
