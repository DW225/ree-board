"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardWithRole } from "@/lib/types/board";
import { Edit3, MoreVertical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useState } from "react";
import DeleteBoardDialog from "./DeleteBoardDialog";
import EditBoardDialog from "./EditBoardDialog";

interface BoardCardProps {
  board: BoardWithRole;
  isOwner?: boolean;
}

const BoardCard: FC<BoardCardProps> = ({ board, isOwner = false }) => {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleClick = () => {
    if (!isDropdownOpen) {
      router.push(`/board/${board.id}`);
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return null;

    // Handle both Date objects and string dates from server responses
    const normalizedDate = date instanceof Date ? date : new Date(date);

    // Check if date is valid
    if (Number.isNaN(normalizedDate.getTime())) return null;

    const now = new Date();
    const diff = now.getTime() - normalizedDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return normalizedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <Card
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className="group relative rounded-lg transition-all duration-200
                   bg-white hover:shadow-md
                   w-72 h-44 flex flex-col cursor-pointer
                   border border-slate-200 hover:border-slate-300"
        aria-label={`Open board: ${board.title}`}
      >
        {/* Action menu - top right (owner only) */}
        {isOwner && (
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded opacity-100
                            transition-opacity duration-150
                            hover:bg-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-slate-600" />
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
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col justify-between h-full p-6 relative z-0">
          {/* Title */}
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-lg font-medium text-center text-slate-900 leading-tight line-clamp-2">
              {board.title}
            </h2>
          </div>

          {/* Metadata footer */}
          {board.updatedAt && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{formatDate(board.updatedAt)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <EditBoardDialog
        boardId={board.id}
        currentTitle={board.title}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete Dialog */}
      <DeleteBoardDialog
        board={board}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
};

export default BoardCard;
