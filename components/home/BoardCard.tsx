"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardWithRole } from "@/lib/types/board";
import { Edit3, MoreHorizontal, Trash2 } from "lucide-react";
import type { FC } from "react";
import DeleteBoardDialog from "./DeleteBoardDialog";
import EditBoardDialog from "./EditBoardDialog";
import { formatCreatedDate, getAccentClass } from "./boardCardUtils";
import { useBoardCardActions } from "./useBoardCardActions";

interface BoardCardProps {
  board: BoardWithRole;
  isOwner?: boolean;
}

const BoardCard: FC<BoardCardProps> = ({ board, isOwner = false }) => {
  const {
    setIsDropdownOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleClick,
  } = useBoardCardActions(board.id);

  const accentClass = getAccentClass(board.id);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="h-40 w-full flex flex-col overflow-hidden rounded-xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] cursor-pointer transition-shadow duration-200 hover:shadow-md text-left p-0 appearance-none font-inherit"
        aria-label={`Open board: ${board.title}`}
      >
        {/* Accent bar */}
        <div className={`h-1 w-full shrink-0 ${accentClass}`} />

        {/* Card body */}
        <div className="flex flex-col flex-1 gap-1.5 px-4 pt-3 pb-3 min-h-0">
          {/* Title + menu row */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex-1 text-[15px] font-semibold text-[#0F172A] leading-snug line-clamp-2">
              {board.title}
            </h2>
            {isOwner && (
              <DropdownMenu onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 rounded text-[#94A3B8] hover:text-slate-500 hover:bg-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Board actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteDialogOpen(true);
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Date */}
          <p className="text-[12px] text-[#94A3B8]">
            {formatCreatedDate(board.createdAt)}
          </p>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="flex items-center justify-end">
            <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] rounded-full px-2 py-0.5 border border-[#E2E8F0]">
              {board.role}
            </span>
          </div>
        </div>
      </button>

      {isOwner && (
        <EditBoardDialog
          boardId={board.id}
          currentTitle={board.title}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {isOwner && (
        <DeleteBoardDialog
          board={board}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        />
      )}
    </>
  );
};

export default BoardCard;
