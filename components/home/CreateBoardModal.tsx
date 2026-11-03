"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBoardAction } from "@/lib/actions/board/action";
import { BOARD_VISIBILITIES, BoardState } from "@/lib/constants/board";
import { Role } from "@/lib/constants/role";
import {
  addBoard,
  createBoardModalOpenSignal,
  removeBoard,
} from "@/lib/signal/boardSignals";
import type { Board, BoardWithRole } from "@/lib/types/board";
import { boardTitleSchema } from "@/lib/utils/validation";
import { useSignals } from "@preact/signals-react/runtime";
import { Loader2, Lock, Users } from "lucide-react";
import { nanoid } from "nanoid";
import type { KeyboardEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface CreateBoardModalProps {
  userID: string;
}

/** Renders the modal used to create a board. */
export default function CreateBoardModal({
  userID,
}: Readonly<CreateBoardModalProps>) {
  useSignals();

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Board["visibility"]>("private");
  const [isPending, startTransition] = useTransition();

  const open = createBoardModalOpenSignal.value;

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setTitle("");
      setTitleError("");
      setDescription("");
      setVisibility("private");
    }
  }

  const setOpen = (v: boolean) => {
    createBoardModalOpenSignal.value = v;
  };

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
    if (isPending || !validateTitle(title)) return;

    const newBoardId = nanoid();
    const newBoard: BoardWithRole = {
      id: newBoardId,
      title: title.trim(),
      description: null,
      visibility,
      teamId: null,
      state: BoardState.active,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: userID,
      role: Role.owner,
    };

    addBoard(newBoard);

    startTransition(async () => {
      try {
        await createBoardAction(newBoard, []);
        toast.success("Board created successfully");
        setOpen(false);
      } catch (error) {
        console.error("Failed to create board:", error);
        toast.error("Failed to create board. Please try again.");
        removeBoard(newBoardId);
      }
    });
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isPending && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPending) return;
        setOpen(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-[#E2E8F0]">
          <DialogTitle className="text-lg font-bold text-[#0F172A]">
            Create Board
          </DialogTitle>
          <DialogDescription className="text-sm text-[#64748B] leading-relaxed">
            Set up a new retrospective board for your team.
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          {/* Board Name */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="board-name"
              className="text-sm font-medium text-[#0F172A]"
            >
              Board Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="board-name"
              placeholder="e.g. Sprint 42 Retro"
              value={title}
              disabled={isPending}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) validateTitle(e.target.value);
              }}
              onBlur={() => title && validateTitle(title)}
              onKeyDown={handleTitleKeyDown}
              className={`rounded-lg border-slate-200 h-10 ${
                titleError ? "border-red-400 focus-visible:ring-red-400" : ""
              }`}
              autoFocus
            />
            {titleError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-600 shrink-0" />
                {titleError}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="board-description"
              className="text-sm font-medium text-[#0F172A]"
            >
              Description
            </Label>
            <Textarea
              id="board-description"
              placeholder="Briefly describe the purpose of this board (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled
              className="rounded-lg border-slate-200 resize-none text-sm opacity-60"
              title="Coming soon"
            />
          </div>

          <fieldset
            disabled={isPending}
            aria-describedby="create-board-visibility-help"
          >
            <legend className="mb-1.5 text-sm font-medium text-[#0F172A]">
              Visibility
            </legend>
            <div className="flex gap-3">
              {BOARD_VISIBILITIES.map((option) => {
                const Icon = option === "team" ? Users : Lock;
                return (
                  <label key={option} className="flex-1">
                    <input
                      type="radio"
                      name="create-board-visibility"
                      value={option}
                      checked={visibility === option}
                      onChange={() => setVisibility(option)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${visibility === option ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-[#E2E8F0] bg-white text-[#64748B]"}`}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {option === "team" ? "Team" : "Private"}
                    </span>
                  </label>
                );
              })}
            </div>
            <p
              id="create-board-visibility-help"
              className="mt-1.5 text-xs text-[#64748B]"
            >
              This setting does not change board access. Manage access in the
              board member settings.
            </p>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0]">
          <span className="text-xs text-[#94A3B8]">
            Fields marked * are required
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="rounded-lg border-slate-200 hover:bg-slate-50 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !title.trim() || !!titleError}
              className="rounded-lg bg-[#0F172A] hover:bg-[#1e293b] text-white text-sm font-medium px-4"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Board"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
