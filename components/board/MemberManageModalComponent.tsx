"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/db/schema";
import { PlusCircle } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useState } from "react";

interface MemberManageProps {
  boardId: string;
  members: MemberInfo[];
}

export interface MemberInfo {
  id: number;
  userId: string;
  role: Role;
  username: string;
  email: string;
  updateAt: Date;
}

const MemberList = dynamic(() => import("@/components/board/MemberList"));

export default function MemberManageModalComponent({
  boardId,
  members,
}: MemberManageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newMember, setNewMember] = useState({ username: "", email: "" });
  const [memberToRemove, setMemberToRemove] = useState<MemberInfo | null>(null);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.username && newMember.email) {
      setMembers([
        ...members,
        { ...newMember, id: Date.now().toString(), role: "Viewer" },
      ]);
      setNewMember({ username: "", email: "" });
    }
  };

  const handleRoleChange = (memberId: string, newRole: MemberInfo["role"]) => {
    setMembers(
      members.map((member) =>
        member.id === memberId ? { ...member, role: newRole } : member
      )
    );
  };

  const handleRemoveMember = (member: MemberInfo) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      setMembers(members.filter((m) => m.id !== memberToRemove.id));
      setMemberToRemove(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Manage Members</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Board Members</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <form onSubmit={handleAddMember} className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newMember.username}
                  onChange={(e) =>
                    setNewMember({ ...newMember, username: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <Button type="submit" className="ml-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </form>
            <div className="mt-6">
              <h4 className="mb-4 text-sm font-medium">Current Members</h4>
              <MemberList
                boardId={boardId}
                members={members}
                handleRemoveMember={handleRemoveMember}
                handleRoleChange={handleRoleChange}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from the
              board?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveMember}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
