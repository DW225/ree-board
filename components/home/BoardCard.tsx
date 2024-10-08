"use client";

import React from "react";
import { Card } from "@/components/common";
import { useRouter } from "next/navigation";
import { authenticatedDeleteBoard } from "@/lib/actions/authenticatedActions";

interface BoardCardProps {
  boardId: string;
  title: string;
  userId: string;
  deletable?: boolean;
}

const BoardCard: React.FC<BoardCardProps> = ({
  boardId,
  title,
  userId,
  deletable = false,
}) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/board/${boardId}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await authenticatedDeleteBoard(boardId, userId);
  };

  return (
    <Card variant="board" onClick={handleClick}>
      {deletable && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors"
          aria-label="Delete board"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
      <h3 className="text-lg font-semibold mb-2 sm:text-base md:text-lg truncate">
        {title}
      </h3>
      <div className="text-sm text-gray-500 hidden sm:block">
        Click to open board
      </div>
    </Card>
  );
};

export default BoardCard;
