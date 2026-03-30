"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBoardTitleAction } from "@/lib/actions/board/action";
import { updateBoardTitle } from "@/lib/signal/boardSignals";
import type { Board } from "@/lib/types/board";
import { boardTitleSchema } from "@/lib/utils/validation";
import { Loader2, Lock, Users, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type VisibilityOption = "team" | "private";

interface EditBoardDialogProps {
  boardId: Board["id"];
  currentTitle: Board["title"];
  currentDescription?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditBoardDialog({
  boardId,
  currentTitle,
  currentDescription,
  open,
  onOpenChange,
}: Readonly<EditBoardDialogProps>) {
  const [title, setTitle] = useState(currentTitle);
  const [titleError, setTitleError] = useState<string>("");
  const [description, setDescription] = useState(currentDescription ?? "");
  const [visibility, setVisibility] = useState<VisibilityOption>("team");
  const [isPending, startTransition] = useTransition();

  // Reset all fields when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setTitleError("");
      setDescription(currentDescription ?? "");
      setVisibility("team");
    }
  }, [open, currentTitle, currentDescription]);

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

    const newTitle = title.trim();

    if (newTitle !== currentTitle) {
      const oldTitle = currentTitle;
      startTransition(async () => {
        try {
          // Optimistic update
          updateBoardTitle(boardId, newTitle);

          // Server action
          await updateBoardTitleAction(boardId, newTitle);

          toast.success("Board updated successfully");
          onOpenChange(false);
        } catch (error) {
          console.error("Failed to update board:", error);
          toast.error("Failed to update board. Please try again.");

          // Rollback on error
          updateBoardTitle(boardId, oldTitle);
        }
      });
    } else {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isPending && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && isPending) return;
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden [&>button:last-of-type]:hidden">
        {/* Screen-reader description */}
        <DialogDescription className="sr-only">
          Edit your board name, description, and visibility settings. Only the
          board name will be saved to the server.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[#E2E8F0]">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-lg font-bold text-[#0F172A]">
              Edit Board
            </DialogTitle>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Update your board settings and details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            aria-label="Close edit board dialog"
            className="flex items-center justify-center w-8 h-8 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 transition-colors shrink-0 mt-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          {/* Board Name */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="edit-board-name"
              className="text-sm font-medium text-[#0F172A]"
            >
              Board Name
            </Label>
            <Input
              id="edit-board-name"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) validateTitle(e.target.value);
              }}
              onBlur={() => title && validateTitle(title)}
              onKeyDown={handleKeyDown}
              aria-describedby={titleError ? "board-name-error" : undefined}
              aria-invalid={!!titleError}
              className={`rounded-lg h-10 ${
                titleError
                  ? "border-red-400 focus-visible:ring-red-400"
                  : "border-[#E2E8F0]"
              }`}
              autoFocus
            />
            {titleError && (
              <p
                id="board-name-error"
                role="alert"
                className="text-sm text-red-600"
              >
                {titleError}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="edit-board-desc"
              className="text-sm font-medium text-[#0F172A]"
            >
              Description
            </Label>
            <Textarea
              id="edit-board-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Board description (coming soon)"
              rows={3}
              disabled
              className="rounded-lg border-[#E2E8F0] resize-none text-sm opacity-50 cursor-not-allowed"
            />
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-[#0F172A]">
              Visibility
            </Label>
            <fieldset
              aria-label="Board visibility"
              className="flex gap-3 opacity-50"
              disabled
            >
              <button
                type="button"
                onClick={() => setVisibility("team")}
                aria-pressed={visibility === "team"}
                disabled
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium cursor-not-allowed ${
                  visibility === "team"
                    ? "bg-[#0F172A] border-[#0F172A] text-white"
                    : "bg-white border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                Team
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                aria-pressed={visibility === "private"}
                disabled
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium cursor-not-allowed ${
                  visibility === "private"
                    ? "bg-[#0F172A] border-[#0F172A] text-white"
                    : "bg-white border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                Private
              </button>
            </fieldset>
            <p className="text-xs text-[#94A3B8]">
              Visibility settings coming soon
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#E2E8F0]">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-lg border-[#E2E8F0] text-sm font-medium"
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !title.trim() || !!titleError}
              className="rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-medium px-4"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
