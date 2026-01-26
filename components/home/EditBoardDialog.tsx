"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBoardTitleAction } from "@/lib/actions/board/action";
import { updateBoardTitle } from "@/lib/signal/boardSignals";
import { boardTitleSchema } from "@/lib/utils/validation";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface EditBoardDialogProps {
  boardId: string;
  currentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditBoardDialog({
  boardId,
  currentTitle,
  open,
  onOpenChange,
}: Readonly<EditBoardDialogProps>) {
  const [title, setTitle] = useState(currentTitle);
  const [titleError, setTitleError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Reset title when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setTitleError("");
    }
  }, [open, currentTitle]);

  const validateTitle = (value: string): boolean => {
    const validation = boardTitleSchema.safeParse(value.trim());
    if (!validation.success) {
      setTitleError(validation.error.issues[0].message);
      return false;
    }
    setTitleError("");
    return true;
  };

  const handleSubmit = () => {
    if (!validateTitle(title)) return;

    const oldTitle = currentTitle;
    const newTitle = title.trim();

    if (oldTitle === newTitle) {
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      try {
        // Optimistic update
        updateBoardTitle(boardId, newTitle);

        // Server action
        await updateBoardTitleAction(boardId, newTitle);

        toast.success("Board title updated successfully");
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to update board title:", error);
        toast.error("Failed to update board title. Please try again.");

        // Rollback on error
        updateBoardTitle(boardId, oldTitle);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isPending && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Edit Board Title
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Update the title of your board.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title" className="text-sm font-medium">
              Board Title
            </Label>
            <Input
              id="edit-title"
              placeholder="e.g., Sprint 42 Retrospective"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) validateTitle(e.target.value);
              }}
              onBlur={() => title && validateTitle(title)}
              onKeyDown={handleKeyDown}
              className={titleError ? "border-red-500" : ""}
              autoFocus
            />
            {titleError && <p className="text-sm text-red-600">{titleError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              !title.trim() ||
              !!titleError ||
              title.trim() === currentTitle
            }
            className="bg-black hover:bg-slate-800"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
