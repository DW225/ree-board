"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { computed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "react-use";
import { AvatarIconWithFallback } from "./AvatarStack";
import type { MemberInfo } from "./MemberManageModalComponent";

interface MemberListProps {
  viewOnly: boolean;
  handleRemoveMember?: (member: MemberInfo) => void;
  handleRoleChange?: (
    memberToUpdate: MemberInfo,
    newRole: MemberInfo["role"]
  ) => void;
  onAssign?: (member: MemberInfo) => void;
}

const roles = {
  Guest: Role.guest,
  Member: Role.member,
  Owner: Role.owner,
} as const;

const roleToKeyMap = {
  [Role.guest]: "Guest",
  [Role.member]: "Member",
  [Role.owner]: "Owner",
} as const satisfies Record<Role, keyof typeof roles>;

export default function MemberList({
  viewOnly,
  handleRemoveMember,
  handleRoleChange,
  onAssign,
}: Readonly<MemberListProps>) {
  useSignals();
  const [searchTerm, setSearchTerm] = useState("");
  const [val, setVal] = useState("");

  useDebounce(
    () => {
      setSearchTerm(val);
    },
    2000,
    [val]
  );

  const filteredMembers = computed(() =>
    memberSignal.value.filter(
      (member) =>
        member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search members..."
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
        }}
      />
      <ScrollArea className="h-[50vh]">
        {filteredMembers.value.map((member) => (
          <div key={member.id} className="flex items-center space-x-4 mb-4">
            <AvatarIconWithFallback
              email={member.email}
              username={member.username}
            />
            <div className="flex-grow">
              <p className="text-sm font-medium">{member.username}</p>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>
            {!viewOnly && handleRoleChange && handleRemoveMember && (
              <div className="flex justify-end">
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
              </div>
            )}
            {onAssign && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssign(member)}
              >
                Assign
              </Button>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
