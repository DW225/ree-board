"use client";

import { AvatarIcon } from "@/components/common/AvatarIcon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Role, roleDisplayName } from "@/lib/constants/role";
import {
  filterMembers,
  filteredMembersSignal,
} from "@/lib/signal/memberSignals";
import type { MemberSignal } from "@/lib/types/member";
import { cn } from "@/lib/utils";
import { useSignals } from "@preact/signals-react/runtime";
import { UserMinus } from "lucide-react";
import { useEffect } from "react";

interface MemberListProps {
  viewOnly: boolean;
  searchTerm: string;
  handleRemoveMember?: (member: MemberSignal) => void;
  onAssign?: (member: MemberSignal) => void;
}

function getRoleBadgeStyles(role: Role): string {
  switch (role) {
    case Role.owner:
      return "bg-[#0F172A] text-white";
    case Role.guest:
      return "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]";
    default: // member
      return "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]";
  }
}

export default function MemberList({
  viewOnly,
  searchTerm,
  handleRemoveMember,
  onAssign,
}: Readonly<MemberListProps>) {
  useSignals();

  // Drive the global filteredMembersSignal via filterMembers whenever searchTerm changes
  useEffect(() => {
    filterMembers(searchTerm);
  }, [searchTerm]);

  // Clean up filter on unmount so other consumers start fresh
  useEffect(() => {
    return () => {
      filterMembers("");
    };
  }, []);

  const members = filteredMembersSignal.value;
  const canRemove = !viewOnly && handleRemoveMember !== undefined;

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-[#E2E8F0] px-4 py-6 text-center text-sm text-slate-400">
        {searchTerm
          ? "No members match your search."
          : "No members yet."}
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-64">
      <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
        {members.map((member, index) => {
          const isLast = index === members.length - 1;
          const isOwner = member.role === Role.owner;

          return (
            <div key={member.id}>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarIcon userID={member.userId} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {member.username}
                    </p>
                    <p className="text-xs text-[#64748B] truncate">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap",
                      getRoleBadgeStyles(member.role)
                    )}
                  >
                    {roleDisplayName[member.role]}
                  </span>

                  {canRemove && !isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember?.(member)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#EF4444] hover:bg-red-50 transition-colors"
                    >
                      <UserMinus className="size-3.5" />
                      Remove
                    </button>
                  )}

                  {onAssign && (
                    <button
                      type="button"
                      onClick={() => onAssign(member)}
                      className="px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] hover:bg-slate-50 transition-colors"
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>
              {!isLast && <div className="h-px bg-[#E2E8F0]" />}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
