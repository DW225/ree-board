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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBoardAction } from "@/lib/actions/board/action";
import { BoardState } from "@/lib/constants/board";
import { Role } from "@/lib/constants/role";
import {
  addBoard,
  createBoardModalOpenSignal,
  removeBoard,
} from "@/lib/signal/boardSignals";
import type { NewBoard } from "@/lib/types/board";
import { boardTitleSchema } from "@/lib/utils/validation";
import { useSignals } from "@preact/signals-react/runtime";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import type { KeyboardEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type TemplateOption =
  | "standard"
  | "start-stop-continue"
  | "4ls"
  | "mad-sad-glad";

interface CreateBoardModalProps {
  userID: string;
}

export default function CreateBoardModal({
  userID,
}: Readonly<CreateBoardModalProps>) {
  useSignals();

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<TemplateOption>("standard");
  const [isPending, startTransition] = useTransition();

  const open = createBoardModalOpenSignal.value;

  // Reset form when modal is closed externally (e.g., via signal)
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setTitleError("");
    setDescription("");
    setTemplate("standard");
  };

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
    if (!validateTitle(title)) return;

    const newBoardId = nanoid();
    const newBoard: NewBoard & {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      creator: string | null;
      role: Role.owner;
    } = {
      id: newBoardId,
      title: title.trim(),
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
    <Dialog open={open} onOpenChange={setOpen}>
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

          {/* Template */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="board-template"
              className="text-sm font-medium text-[#0F172A]"
            >
              Template
            </Label>
            <Select
              value={template}
              onValueChange={(v) => setTemplate(v as TemplateOption)}
              disabled
            >
              <SelectTrigger
                id="board-template"
                className="rounded-lg border-slate-200 h-10 text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  Standard (Went Well / To Improve / To Discuss / Action Items)
                </SelectItem>
                <SelectItem value="start-stop-continue">
                  Start / Stop / Continue
                </SelectItem>
                <SelectItem value="4ls">4Ls</SelectItem>
                <SelectItem value="mad-sad-glad">Mad / Sad / Glad</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
