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
import {
  addMemberToBoardAction,
  findUserByEmailAction,
  removeMemberFromBoardAction,
} from "@/lib/actions/member/action";
import { Role } from "@/lib/constants/role";
import {
  addMember,
  memberSignal,
  removeMember,
} from "@/lib/signal/memberSignals";
import type { MemberSignal } from "@/lib/types/member";
import { emailSchema } from "@/lib/utils/validation";
import { useSignals } from "@preact/signals-react/runtime";
import { Search, Upload, UserPlus } from "lucide-react";
import { nanoid } from "nanoid";
import dynamic from "next/dynamic";
import type { ReactNode, SubmitEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface MemberManageProps {
  boardId: string;
  viewOnly: boolean;
  children: ReactNode;
}

const MemberList = dynamic(() => import("@/components/board/MemberList"), {
  loading: () => (
    <div className="space-y-2">
      <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
    </div>
  ),
});

const ImportMembersComponent = dynamic(
  () => import("@/components/board/ImportMembersComponent"),
);

export default function MemberManageModalComponent({
  boardId,
  viewOnly,
  children,
}: Readonly<MemberManageProps>) {
  useSignals();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailError, setInviteEmailError] = useState<string>("");
  const [memberToRemove, setMemberToRemove] = useState<MemberSignal | null>(
    null,
  );
  const [isInvitePending, startInviteTransition] = useTransition();
  const [isRemoving, setIsRemoving] = useState(false);

  const totalCount = memberSignal.value.length;

  const handleInviteMember = (e: SubmitEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const emailResult = emailSchema.safeParse(inviteEmail.trim());
    if (!emailResult.success) {
      setInviteEmailError(emailResult.error.issues[0].message);
      return;
    }
    setInviteEmailError("");

    startInviteTransition(async () => {
      try {
        const user = await findUserByEmailAction(emailResult.data);
        if (!user) {
          throw new Error("User not found");
        }

        const memberId = nanoid();
        const newMemberSignal: MemberSignal = {
          id: memberId,
          userId: user.id,
          username: user.name,
          email: inviteEmail,
          role: Role.member,
        };

        await addMemberToBoardAction({
          id: memberId,
          boardId,
          role: Role.member,
          userId: user.id,
        });

        addMember(newMemberSignal);
        setInviteEmail("");
        toast.success("Member invited successfully.");
      } catch (error) {
        toast.error("Could not invite member. User might not exist.");
        console.error(error);
      }
    });
  };

  const handleRemoveMember = (member: MemberSignal) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    const removedMember = memberToRemove;
    setIsRemoving(true);
    removeMember(removedMember.id); // optimistic removal

    try {
      await removeMemberFromBoardAction(removedMember.userId, boardId);
      toast.success("Member removed.");
      setMemberToRemove(null);
    } catch (error) {
      addMember(removedMember); // rollback on failure
      toast.error("Error removing member. Please try again later.");
      console.error(error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSearchTerm("");
            setInviteEmail("");
            setInviteEmailError("");
          }
        }}
      >
        <DialogTrigger className="cursor-pointer">{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-xl border-[#E2E8F0] p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogDescription className="sr-only">
            Manage team members and their roles for this board.
          </DialogDescription>
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E2E8F0]">
            <div>
              <DialogTitle className="text-base font-semibold text-[#0F172A]">
                Manage Members
              </DialogTitle>
              <p className="text-xs text-[#64748B] mt-0.5">
                Add, remove, or update roles for board members.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8] pointer-events-none" />
              <Input
                type="text"
                placeholder="Search Members"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-[#E2E8F0] bg-white text-sm placeholder:text-[#94A3B8] focus-visible:ring-1 focus-visible:ring-[#0F172A]"
              />
            </div>

            {/* Member list */}
            <MemberList
              viewOnly={viewOnly}
              searchTerm={searchTerm}
              handleRemoveMember={viewOnly ? undefined : handleRemoveMember}
            />

            {/* Invite by Email */}
            {!viewOnly && (
              <div className="pt-2 border-t border-[#E2E8F0]">
                <p className="text-xs font-medium text-[#0F172A] mb-2">
                  Invite by Email
                </p>
                <form
                  onSubmit={handleInviteMember}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        if (inviteEmailError) setInviteEmailError("");
                      }}
                      disabled={isInvitePending}
                      className={`flex-1 border-[#E2E8F0] bg-white text-sm placeholder:text-[#94A3B8] focus-visible:ring-1 focus-visible:ring-[#0F172A] ${
                        inviteEmailError
                          ? "border-red-400 focus-visible:ring-red-400"
                          : ""
                      }`}
                    />
                    <Button
                      type="submit"
                      disabled={isInvitePending || !inviteEmail}
                      className="bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-medium shrink-0"
                    >
                      <UserPlus className="size-4 mr-1.5" />
                      {isInvitePending ? "Inviting..." : "Invite"}
                    </Button>
                  </div>
                  {inviteEmailError && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-600 shrink-0" />
                      {inviteEmailError}
                    </p>
                  )}
                </form>

                {/* OR divider + Import from Other Boards */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#E2E8F0]" />
                  <span className="text-xs text-[#94A3B8] font-medium">
                    OR
                  </span>
                  <div className="flex-1 h-px bg-[#E2E8F0]" />
                </div>
                <ImportMembersComponent
                  currentBoardId={boardId}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-slate-50">
            <span className="text-xs text-[#64748B]">
              {totalCount} {totalCount === 1 ? "member" : "members"} total
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="border-[#E2E8F0] text-[#0F172A] text-sm font-medium"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation dialog */}
      <Dialog
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open && isRemoving) return;
          setMemberToRemove(null);
        }}
      >
        <DialogContent className="sm:max-w-sm rounded-xl border-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A]">Remove Member</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              Are you sure you want to remove{" "}
              <span className="font-medium text-[#0F172A]">
                {memberToRemove?.username}
              </span>{" "}
              from the board?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemoving}
              className="border-[#E2E8F0]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmRemoveMember}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
