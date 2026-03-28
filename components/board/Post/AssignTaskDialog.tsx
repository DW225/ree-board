"use client";

import MemberList from "@/components/board/MemberList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { membersSignal } from "@/lib/signal/memberSignals";
import type { MemberSignal } from "@/lib/types/member";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface AssignTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssigneeId?: string | null;
  onAssign: (member: MemberSignal) => Promise<void>;
}

export function AssignTaskDialog({
  isOpen,
  onClose,
  currentAssigneeId,
  onAssign,
}: Readonly<AssignTaskDialogProps>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberSignal | null>(
    null,
  );
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      const current = membersSignal.value.find(
        (m) => m.userId === currentAssigneeId,
      );
      setSelectedMember(current ?? null);
    }
  }, [isOpen, currentAssigneeId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden h-[480px] flex flex-col [&>button:last-child]:hidden">
        <DialogDescription className="sr-only">
          Select a member to assign this action item to.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#E2E8F0] shrink-0">
          <DialogTitle className="text-lg font-bold text-[#0F172A]">
            Assign Task
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assign task dialog"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X
              className="w-[18px] h-[18px] text-[#94A3B8]"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-6 py-4 flex-1 overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white">
            <Search
              className="w-4 h-4 text-[#94A3B8] shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search members"
              className="flex-1 text-sm text-[#0F172A] placeholder:text-[#94A3B8] bg-transparent outline-none border-none"
            />
          </div>

          {/* Members label */}
          <span className="text-[11px] font-semibold text-[#94A3B8] tracking-[1.5px]">
            MEMBERS
          </span>

          {/* Member list */}
          <MemberList
            viewOnly={true}
            searchTerm={searchTerm}
            selectedUserId={selectedMember?.userId ?? null}
            onSelect={(member) =>
              setSelectedMember(
                selectedMember?.userId === member.userId ? null : member,
              )
            }
            className="flex-1"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 h-[68px] px-6 border-t border-[#E2E8F0] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-[38px] px-[18px] rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!selectedMember) return;
              setIsAssigning(true);
              try {
                await onAssign(selectedMember);
                onClose();
              } finally {
                setIsAssigning(false);
              }
            }}
            disabled={!selectedMember || isAssigning}
            className="flex items-center justify-center h-[38px] px-[18px] rounded-lg bg-[#6366F1] text-white text-sm font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Assign Task
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
