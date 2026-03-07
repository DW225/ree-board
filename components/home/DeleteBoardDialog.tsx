"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteBoardAction } from "@/lib/actions/board/action";
import { addBoard, removeBoard } from "@/lib/signal/boardSignals";
import type { BoardWithRole } from "@/lib/types/board";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface DeleteBoardDialogProps {
  board: BoardWithRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteBoardDialog({
  board,
  open,
  onOpenChange,
}: Readonly<DeleteBoardDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const [confirmName, setConfirmName] = useState("");
  const isConfirmed = confirmName === board.title;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setConfirmName("");
    onOpenChange(nextOpen);
  };

  const handleDelete = () => {
    if (!isConfirmed) return;

    const boardSnapshot = { ...board };

    startTransition(async () => {
      try {
        removeBoard(board.id);
        await deleteBoardAction(board.id);
        toast.success("Board deleted successfully");
        handleOpenChange(false);
      } catch (error) {
        console.error("Failed to delete board:", error);
        toast.error("Failed to delete board. Please try again.");
        addBoard(boardSnapshot);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] gap-0 p-0">
        <DialogHeader className="flex flex-col gap-1 space-y-0 p-6 pb-5">
          <DialogTitle className="text-lg font-bold text-slate-900">
            Delete Board
          </DialogTitle>
          <p className="text-sm text-slate-500">
            This action is permanent and cannot be undone.
          </p>
        </DialogHeader>

        <div className="h-px bg-slate-200" />

        <div className="flex flex-col gap-4 px-6 py-5">
          {/* Warning banner */}
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-red-800">
                You are about to delete this board
              </p>
              <p className="text-[13px] text-red-600">
                All posts, votes, and member data associated with this board
                will be permanently deleted. This cannot be recovered.
              </p>
            </div>
          </div>

          {/* Confirmation input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirm-board-name"
              className="text-[13px] font-medium text-gray-700"
            >
              To confirm, type the board name below:
            </label>
            <Input
              id="confirm-board-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Enter board name..."
              disabled={isPending}
              className="h-10 rounded-lg border-slate-200"
            />
          </div>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="h-10 rounded-lg border-slate-200 px-4 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending || !isConfirmed}
            className="h-10 rounded-lg bg-red-600 px-4 hover:bg-red-700"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Board
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
