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
import {
  addMemberToBoardAction,
  findUserByEmailAction,
  removeMemberFromBoardAction,
} from "@/lib/actions/member/action";
import { Role } from "@/lib/constants/role";
import {
  addMember,
  removeMember,
  updateMember,
} from "@/lib/signal/memberSignals";
import type { Member, MemberSignal } from "@/lib/types/member";
import { PlusCircle } from "lucide-react";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface MemberManageProps {
  boardId: string;
  viewOnly: boolean;
  children: ReactNode;
}

const MemberList = dynamic(() => import("@/components/board/MemberList"), {
  loading: () => (
    <div className="space-y-2">
      <div className="h-12 bg-gray-200 rounded animate-pulse" />
      <div className="h-12 bg-gray-200 rounded animate-pulse" />
      <div className="h-12 bg-gray-200 rounded animate-pulse" />
    </div>
  ),
});

const ImportMembersComponent = dynamic(
  () => import("@/components/board/ImportMembersComponent"),
  {
    loading: () => (
      <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
    ),
  }
);

const MagicLinkCreator = dynamic(
  () => import("@/components/board/MagicLinkCreator"),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="h-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    ),
  }
);

const MagicLinkManager = dynamic(
  () => import("@/components/board/MagicLinkManager"),
  {
    loading: () => (
      <div className="space-y-2">
        <div className="h-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-16 bg-gray-200 rounded animate-pulse" />
      </div>
    ),
  }
);

export default function MemberManageModalComponent({
  boardId,
  viewOnly,
  children,
}: Readonly<MemberManageProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [newMember, setNewMember] = useState({ email: "" });
  const [memberToRemove, setMemberToRemove] = useState<MemberSignal | null>(
    null
  );

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMember.email) return;

    try {
      const user = await findUserByEmailAction(newMember.email);
      if (!user) {
        throw new Error("User not found");
      }

      const memberId = nanoid();
      const newMemberSignal = {
        id: memberId,
        userId: user.id,
        username: user.name,
        email: newMember.email,
        role: Role.member,
      };

      await addMemberToBoardAction({
        id: memberId,
        boardId,
        role: Role.member,
        userId: user.id,
      });

      addMember(newMemberSignal);
      setNewMember({ email: "" });
    } catch (error) {
      toast.error("Error adding member. User might not exist.");
      console.error(error);
    }
  };

  const handleRoleChange = useCallback(
    (memberToUpdate: MemberSignal, newRole: Member["role"]) => {
      updateMember({
        ...memberToUpdate,
        role: newRole,
      });
    },
    []
  );

  const handleRemoveMember = (member: MemberSignal) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
    if (memberToRemove) {
      try {
        removeMember(memberToRemove.id);

        await removeMemberFromBoardAction(memberToRemove.id, boardId);
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
          <button>{children}</button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Board Members</DialogTitle>
          </DialogHeader>{" "}
          <div className="grid gap-4">
            {!viewOnly && (
              <>
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
                    <PlusCircle className="mr-2 size-4" />
                    Add Member
                  </Button>
                </form>

                <div className="flex items-center gap-2">
                  <hr className="flex-1" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <hr className="flex-1" />
                </div>

                <div className="flex justify-center">
                  <ImportMembersComponent
                    currentBoardId={boardId}
                    onImportComplete={() => {
                      // Optionally refresh the member list or show success message
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <hr className="flex-1" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <hr className="flex-1" />
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Create Magic Link</h4>
                    <MagicLinkCreator boardId={boardId} />
                  </div>
                </div>
              </>
            )}
            <div className="mt-6">
              <h4 className="mb-4 text-sm font-medium">Current Members</h4>
              <MemberList
                viewOnly={viewOnly}
                handleRemoveMember={handleRemoveMember}
                handleRoleChange={handleRoleChange}
              />
            </div>

            {!viewOnly && (
              <div className="mt-6">
                <MagicLinkManager boardId={boardId} />
              </div>
            )}
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
