"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bulkImportMembersAction,
  getBoardsWhereUserIsAdminAction,
  getMembersFromBoardWithExclusionAction,
} from "@/lib/actions/member/action";
import { Role } from "@/lib/constants/role";
import { addMember } from "@/lib/signal/memberSignals";
import type { Board } from "@/lib/types/board";
import { Check, Upload, Users } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ImportMembersProps {
  currentBoardId: string;
  onImportComplete?: () => void;
}

interface BoardMember {
  id: string;
  userId: string;
  role: Role;
  username: string;
  email: string;
  boardId: string;
  boardTitle: string;
}

const AVATAR_COLORS = [
  "#6366F1",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#3B82F6",
  "#14B8A6",
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(/[\s_]+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeStyle(role: Role) {
  switch (role) {
    case Role.owner:
      return "bg-[#F0FDF4] text-[#16A34A]";
    case Role.member:
      return "bg-[#EEF2FF] text-[#6366F1]";
    case Role.guest:
      return "bg-[#F1F5F9] text-[#475569]";
    default:
      return "bg-[#F1F5F9] text-[#475569]";
  }
}

function getRoleLabel(role: Role) {
  switch (role) {
    case Role.owner:
      return "owner";
    case Role.member:
      return "member";
    case Role.guest:
      return "guest";
    default:
      return "unknown";
  }
}

export default function ImportMembersComponent({
  currentBoardId,
  onImportComplete,
}: Readonly<ImportMembersProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableBoards, setAvailableBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadAvailableBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      const boards = await getBoardsWhereUserIsAdminAction();
      const filteredBoards = boards
        ? boards.filter((board) => board.id !== currentBoardId)
        : [];
      setAvailableBoards(filteredBoards);
    } catch (error) {
      toast.error("Failed to load available boards");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentBoardId]);

  useEffect(() => {
    if (isOpen) {
      loadAvailableBoards();
    }
  }, [isOpen, loadAvailableBoards]);

  const loadBoardMembers = useCallback(async () => {
    if (!selectedBoardId) return;

    try {
      setIsLoading(true);
      const members = await getMembersFromBoardWithExclusionAction(
        selectedBoardId,
        currentBoardId,
      );

      if (Array.isArray(members)) {
        setBoardMembers(members);
      } else {
        console.error("Failed to load members:", members);
        toast.error("Failed to load board members");
        setBoardMembers([]);
      }

      setSelectedMembers(new Set());
    } catch (error) {
      toast.error("Failed to load board members");
      console.error(error);
      setBoardMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBoardId, currentBoardId]);

  useEffect(() => {
    if (selectedBoardId) {
      loadBoardMembers();
    } else {
      setBoardMembers([]);
      setSelectedMembers(new Set());
    }
  }, [selectedBoardId, loadBoardMembers]);

  const handleMemberToggle = useCallback((memberId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedMembers.size === boardMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(boardMembers.map((m) => m.id)));
    }
  }, [boardMembers, selectedMembers.size]);

  const handleImport = async () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member to import");
      return;
    }

    try {
      setIsImporting(true);

      const membersToImport = boardMembers
        .filter((member) => selectedMembers.has(member.id))
        .map((member) => ({
          userId: member.userId,
          role: member.role,
        }));

      const result = await bulkImportMembersAction(
        currentBoardId,
        membersToImport,
      );

      if (result && typeof result === "object" && "imported" in result) {
        const importedMembers = boardMembers.filter((member) =>
          selectedMembers.has(member.id),
        );

        for (const member of importedMembers) {
          const newMemberSignal = {
            id: nanoid(),
            userId: member.userId,
            username: member.username,
            email: member.email,
            role: member.role,
          };
          addMember(newMemberSignal);
        }

        toast.success(
          `Successfully imported ${result.imported} members` +
            (result.skipped > 0 ? ` (${result.skipped} already existed)` : ""),
        );

        setSelectedMembers(new Set());
        setSelectedBoardId("");
        setBoardMembers([]);
        setIsOpen(false);

        onImportComplete?.();
      } else {
        throw new Error("Import failed");
      }
    } catch (error) {
      toast.error("Failed to import members");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedBoardId("");
      setBoardMembers([]);
      setSelectedMembers(new Set());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
        >
          <Upload className="size-3.5" />
          Import from Other Boards
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] rounded-xl border-[#E2E8F0] p-0 gap-0 overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.15),0_1px_3px_rgba(15,23,42,0.05)]">
        <DialogDescription className="sr-only">
          Select members from boards where you are an admin to import them here.
        </DialogDescription>

        {/* Header */}
        <div className="px-6 pt-6 pb-5 space-y-1.5">
          <DialogTitle className="text-lg font-bold text-[#0F172A]">
            Import Members
          </DialogTitle>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Select members from boards where you are an admin to import them
            here.
          </p>
        </div>

        <div className="h-px bg-[#E2E8F0]" />

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Source Board Select */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#0F172A]">
              Source Board
            </label>
            <Select
              value={selectedBoardId}
              onValueChange={setSelectedBoardId}
              disabled={isLoading || isImporting}
            >
              <SelectTrigger className="w-full rounded-lg border-[#E2E8F0] bg-white text-sm focus:ring-1 focus:ring-[#0F172A]">
                <SelectValue placeholder="Select a board..." />
              </SelectTrigger>
              <SelectContent>
                {availableBoards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Members Header */}
          {selectedBoardId && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#0F172A]">
                  {boardMembers.length} members available
                </span>
                {boardMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={isLoading || isImporting}
                    className="text-[13px] font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors disabled:opacity-50"
                  >
                    {selectedMembers.size === boardMembers.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                )}
              </div>

              {/* Member Rows */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {isLoading && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-[#94A3B8]">
                      Loading members...
                    </p>
                  </div>
                )}
                {!isLoading && boardMembers.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-[#94A3B8]">
                    <Users className="size-8 mb-2" />
                    <p className="text-sm">No members found in this board</p>
                  </div>
                )}
                {!isLoading &&
                  boardMembers.map((member, index) => {
                    const isSelected = selectedMembers.has(member.id);
                    return (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => handleMemberToggle(member.id)}
                        disabled={isImporting}
                        className={`flex w-full items-center gap-3 rounded-lg border p-2.5 transition-colors text-left disabled:opacity-50 ${
                          isSelected
                            ? "border-[#6366F1] bg-[#FAFAFE]"
                            : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`flex size-[18px] shrink-0 items-center justify-center rounded ${
                            isSelected
                              ? "bg-[#6366F1]"
                              : "border-[1.5px] border-[#CBD5E1]"
                          }`}
                        >
                          {isSelected && (
                            <Check className="size-3 text-white" />
                          )}
                        </div>

                        {/* Avatar */}
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{
                            backgroundColor: getAvatarColor(index),
                          }}
                        >
                          {getInitials(member.username)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A] truncate">
                            {member.username}
                          </p>
                          <p className="text-xs text-[#94A3B8] truncate">
                            {member.email}
                          </p>
                        </div>

                        {/* Role Badge */}
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${getRoleBadgeStyle(member.role)}`}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Selection count */}
              {boardMembers.length > 0 && (
                <p className="text-xs text-[#94A3B8]">
                  {selectedMembers.size} of {boardMembers.length} selected
                </p>
              )}
            </>
          )}
        </div>

        <div className="h-px bg-[#E2E8F0]" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-lg border-[#E2E8F0] text-sm font-medium text-[#374151]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedMembers.size === 0 || isImporting}
            className="rounded-lg bg-[#0F172A] text-sm font-medium text-white hover:bg-[#1E293B] disabled:opacity-50"
          >
            {isImporting
              ? "Importing..."
              : `Import ${selectedMembers.size} Member${selectedMembers.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
