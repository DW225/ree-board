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
import { Role } from "@/db/schema";
import {
  authenticatedAddMemberToBoard,
  authenticatedFindUserByEmail,
  authenticatedRemoveMemberFromBoard,
} from "@/lib/actions/authenticatedActions";
import {
  addMember,
  removeMember,
  updateMember,
} from "@/lib/signal/memberSingals";
import { toast } from "@/lib/signal/toastSignals";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import React, { useCallback, useState } from "react";

interface MemberManageProps {
  boardId: string;
}

export interface MemberInfo {
  id: string;
  userId: string;
  role: Role;
  username: string;
  email: string;
  updateAt: Date;
}

const MemberList = dynamic(() => import("@/components/board/MemberList"));

export default function MemberManageModalComponent({
  boardId,
}: Readonly<MemberManageProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [newMember, setNewMember] = useState({ email: "" });
  const [memberToRemove, setMemberToRemove] = useState<MemberInfo | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email) return;

    try {
      const user = await authenticatedFindUserByEmail(newMember.email);
      if (!user) {
        throw new Error("User not found");
      }

      const memberId = nanoid();
      const newMemberInfo = {
        id: memberId,
        userId: user.id,
        username: user.name,
        email: newMember.email,
        role: Role.member,
        updateAt: new Date(),
      };

      await authenticatedAddMemberToBoard({
        id: memberId,
        boardId,
        role: Role.member,
        userId: user.id,
      });

      addMember(newMemberInfo);
      setNewMember({ email: "" });
    } catch (error) {
      toast.error("Error adding member. User might not exist.");
      console.error(error);
    }
  };

  const handleRoleChange = useCallback(
    (memberToUpdate: MemberInfo, newRole: MemberInfo["role"]) => {
      updateMember({
        ...memberToUpdate,
        role: newRole,
      });
    },
    []
  );

  const handleRemoveMember = (member: MemberInfo) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
    if (memberToRemove) {
      try {
        removeMember(memberToRemove.id);
        await authenticatedRemoveMemberFromBoard(memberToRemove.id, boardId);
        setMemberToRemove(null);
      } catch (error) {
        toast.error("Error removing member. Please try again later.");
        console.error(error);
      }
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
                <PlusCircleIcon className="mr-2 size-4" />
                Add Member
              </Button>
            </form>
            <div className="mt-6">
              <h4 className="mb-4 text-sm font-medium">Current Members</h4>
              <MemberList
                boardId={boardId}
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
              Are you sure you want to remove {memberToRemove?.username} from
              the board?
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
