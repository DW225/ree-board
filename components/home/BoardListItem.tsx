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

interface BoardListItemProps {
  board: BoardWithRole;
  isOwner?: boolean;
}

const BoardListItem: FC<BoardListItemProps> = ({ board, isOwner = false }) => {
  const {
    isDropdownOpen,
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
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className="flex h-14 w-full overflow-hidden rounded-xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)] cursor-pointer transition-shadow duration-200 hover:shadow-md text-left"
        aria-label={`Open board: ${board.title}`}
      >
        {/* Accent stripe */}
        <div className={`w-1 shrink-0 self-stretch ${accentClass}`} />

        {/* Content */}
        <div className="flex flex-1 items-center gap-4 px-4 min-w-0">
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-[#0F172A] leading-snug truncate">
              {board.title}
            </h2>
            <p className="text-[11px] text-[#94A3B8]">
              {formatCreatedDate(board.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] rounded-full px-2 py-0.5 border border-[#E2E8F0]">
              {board.role}
            </span>

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
        </div>
      </div>

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

export default BoardListItem;
