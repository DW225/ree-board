"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrashIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import type { MemberInfo } from "./MemberManageModalComponent";
import { Role } from "@/db/schema";
import { getEnumKeys } from "@/lib/utils";

interface MemberListProps {
  boardId: string;
  members: MemberInfo[];
  handleRemoveMember: (member: MemberInfo) => void;
  handleRoleChange: (memberId: string, newRole: MemberInfo["role"]) => void;
}

export default function MemberList({
  members,
  handleRemoveMember,
  handleRoleChange,
}: MemberListProps) {
  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <div key={member.id} className="flex items-center space-x-4 mb-4">
          <UserCircleIcon className="h-6 w-6" />
          <div className="flex-grow">
            <p className="text-sm font-medium">{member.username}</p>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>
          <Select
            onValueChange={(value: MemberInfo["role"]) =>
              handleRoleChange(member.id, value)
            }
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {getEnumKeys(Role).map((role) => (
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
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </ul>
  );
}
