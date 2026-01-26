"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteBoardAction } from "@/lib/actions/board/action";
import { addBoard, removeBoard } from "@/lib/signal/boardSignals";
import type { BoardWithRole } from "@/lib/types/board";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
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

  const handleDelete = () => {
    const boardSnapshot = { ...board };

    startTransition(async () => {
      try {
        // Optimistic update
        removeBoard(board.id);

        // Server action
        await deleteBoardAction(board.id);

        toast.success("Board deleted successfully");
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to delete board:", error);
        toast.error("Failed to delete board. Please try again.");

        // Rollback on error
        addBoard(boardSnapshot);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-slate-900">
            Delete Board
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600">
            Are you sure you want to delete <strong>"{board.title}"</strong>?
            This action cannot be undone and all associated data will be
            permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
