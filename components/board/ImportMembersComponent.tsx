"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { addMember } from "@/lib/signal/memberSingals";
import type { Board } from "@/lib/types/board";
import { Upload, Users } from "lucide-react";
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

export default function ImportMembersComponent({
  currentBoardId,
  onImportComplete,
}: ImportMembersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableBoards, setAvailableBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Load available boards when dialog opens
  const loadAvailableBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      const boards = await getBoardsWhereUserIsAdminAction();
      // Filter out the current board
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
        currentBoardId
      );

      // Check if members is an array before setting state
      if (Array.isArray(members)) {
        setBoardMembers(members);
      } else {
        // Handle error response
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

  // Load members when board is selected
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
        membersToImport
      );

      // Check if result is a NextResponse (error case)
      if (result && typeof result === "object" && "imported" in result) {
        // Update the local state with imported members
        const importedMembers = boardMembers.filter((member) =>
          selectedMembers.has(member.id)
        );

        importedMembers.forEach((member) => {
          const newMemberSignal = {
            id: nanoid(),
            userId: member.userId,
            username: member.username,
            email: member.email,
            role: member.role,
          };
          addMember(newMemberSignal);
        });

        toast.success(
          `Successfully imported ${result.imported} members` +
            (result.skipped > 0 ? ` (${result.skipped} already existed)` : "")
        );

        // Reset state
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

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case Role.owner:
        return "Owner";
      case Role.member:
        return "Member";
      case Role.guest:
        return "Guest";
      default:
        return "Unknown";
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case Role.owner:
        return "default";
      case Role.member:
        return "secondary";
      case Role.guest:
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 size-4" />
          Import from Other Boards
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Members from Other Boards</DialogTitle>
          <DialogDescription>
            Select members from boards where you are an admin to import them to
            this board.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Board Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="board-select" className="text-right">
              Source Board
            </Label>
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a board to import from" />
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

          {/* Members List */}
          {selectedBoardId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Members ({boardMembers.length})
                </Label>
                {boardMembers.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isLoading}
                  >
                    {selectedMembers.size === boardMembers.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>

              <ScrollArea className="h-64 rounded-md border p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">
                      Loading members...
                    </div>
                  </div>
                ) : boardMembers.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">
                      <Users className="mx-auto mb-2 size-8" />
                      No members found in this board
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {boardMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted"
                      >
                        <Checkbox
                          id={member.id}
                          checked={selectedMembers.has(member.id)}
                          onCheckedChange={() => handleMemberToggle(member.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {member.username}
                            </p>
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedMembers.size > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedMembers.size} member
                  {selectedMembers.size !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedMembers.size === 0 || isImporting}
          >
            {isImporting
              ? "Importing..."
              : `Import ${selectedMembers.size} Members`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
