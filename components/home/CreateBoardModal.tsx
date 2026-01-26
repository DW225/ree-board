"use client";

import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { createBoardAction } from "@/lib/actions/board/action";
import { BoardState } from "@/lib/constants/board";
import { Role } from "@/lib/constants/role";
import { addBoard, removeBoard } from "@/lib/signal/boardSignals";
import type { NewBoard } from "@/lib/types/board";
import { boardTitleSchema, emailSchema } from "@/lib/utils/validation";
import { Loader2, Mail, Plus, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface CreateBoardModalProps {
  userID: string;
}

export default function CreateBoardModal({
  userID,
}: Readonly<CreateBoardModalProps>) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [memberEmails, setMemberEmails] = useState<string[]>([]);

  const addMemberEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    const validation = emailSchema.safeParse(trimmed);
    if (!validation.success) {
      setEmailError(validation.error.issues[0].message);
      return;
    }

    const normalized = validation.data;
    if (memberEmails.includes(normalized)) {
      setEmailError("Email already added");
      return;
    }

    setMemberEmails((prev) => [...prev, normalized]);
    setEmailInput("");
    setEmailError("");
  };

  const removeMemberEmail = (email: string) => {
    setMemberEmails(memberEmails.filter((e) => e !== email));
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

    // Optimistically update the UI
    addBoard(newBoard);

    startTransition(async () => {
      try {
        await createBoardAction(newBoard, memberEmails);
        toast.success("Board created successfully");
        setOpen(false);
        setTitle("");
        setMemberEmails([]);
        setTitleError("");
      } catch (error) {
        console.error("Failed to create board:", error);
        toast.error("Failed to create board. Please try again.");
        // Remove optimistic update on error
        removeBoard(newBoardId);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      e.currentTarget.id === "member-email"
    ) {
      e.preventDefault();
      addMemberEmail();
    } else if (e.key === "Enter" && !e.shiftKey && !isPending && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="group relative w-72 h-44 rounded-lg
                   bg-white hover:shadow-md
                   border-2 border-dashed border-slate-300 hover:border-slate-400
                   transition-all duration-200
                   p-0"
        >
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-slate-900">
                Create new board
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Start a fresh retrospective
              </p>
            </div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Create New Board
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Give your retrospective board a memorable name.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-6">
          {/* Board title input */}
          <div className="grid gap-2.5">
            <Label
              htmlFor="title"
              className="text-sm font-medium text-slate-700"
            >
              Board Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Sprint 42 Retrospective"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) validateTitle(e.target.value);
              }}
              onBlur={() => title && validateTitle(title)}
              onKeyDown={handleKeyDown}
              className={`h-11 rounded-xl border-slate-300 focus:border-cyan-400 focus:ring-cyan-400
                        ${titleError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
              autoFocus
            />
            {titleError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-600" />
                {titleError}
              </p>
            )}
          </div>

          {/* Member invitation section */}
          <div className="grid gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" />
              <Label
                htmlFor="member-email"
                className="text-sm font-medium text-slate-700"
              >
                Invite Team Members{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
            </div>

            <div className="flex gap-2">
              <Input
                id="member-email"
                type="email"
                placeholder="colleague@company.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onKeyDown={handleKeyDown}
                className={`h-10 flex-1 rounded-lg border-slate-300 bg-white
                          ${emailError ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
              />
              <Button
                type="button"
                onClick={addMemberEmail}
                variant="secondary"
                size="sm"
                className="h-10 px-4 rounded-lg font-medium"
                disabled={!emailInput.trim()}
              >
                Add
              </Button>
            </div>

            {emailError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-600" />
                {emailError}
              </p>
            )}

            {memberEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                {memberEmails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="pl-3 pr-1.5 py-1.5 rounded-lg bg-white border border-slate-300
                             text-slate-700 font-medium shadow-sm
                             hover:bg-slate-50 transition-colors group"
                  >
                    <span className="text-sm">{email}</span>
                    <Button
                      type="button"
                      onClick={() => removeMemberEmail(email)}
                      variant="ghost"
                      size="icon"
                      className="ml-1.5 h-5 w-5 p-0 hover:bg-slate-200 rounded"
                    >
                      <X className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="rounded-xl border-slate-300 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !title.trim() || !!titleError}
            className="bg-black hover:bg-slate-800"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
