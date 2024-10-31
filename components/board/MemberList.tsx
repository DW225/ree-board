"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/db/schema";
import { memberSignal } from "@/lib/signal/memberSingals";
import { getEnumKeys } from "@/lib/utils";
import { Trash2, UserCircle } from "lucide-react";
import type { MemberInfo } from "./MemberManageModalComponent";

interface MemberListProps {
  viewOnly: boolean;
  handleRemoveMember: (member: MemberInfo) => void;
  handleRoleChange: (
    memberToUpdate: MemberInfo,
    newRole: MemberInfo["role"]
  ) => void;
}

export default function MemberList({
  viewOnly,
  handleRemoveMember,
  handleRoleChange,
}: Readonly<MemberListProps>) {
  const roles = {
    Guest: Role.guest,
    Member: Role.member,
    Owner: Role.owner,
  };

  const roleToKeyMap: Record<Role, keyof typeof roles> = {
    [Role.guest]: "Guest",
    [Role.member]: "Member",
    [Role.owner]: "Owner",
  };

  return (
    <ul className="space-y-2 max-h-40vh">
      {memberSignal.value.map((member) => (
        <div key={member.id} className="flex items-center space-x-4 mb-4">
          <UserCircle className="h-6 w-6" />
          <div className="flex-grow">
            <p className="text-sm font-medium">{member.username}</p>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>
          {!viewOnly && (
            <>
              <Select
                value={roleToKeyMap[member.role]}
                onValueChange={(value: keyof typeof roles) =>
                  handleRoleChange(member, roles[value])
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {getEnumKeys(roles).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMember(member)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ))}
    </ul>
  );
}
