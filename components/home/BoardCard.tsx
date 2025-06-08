"use client";

import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import type { FC } from "react";

interface BoardCardProps {
  boardId: string;
  title: string;
}

const BoardCard: FC<BoardCardProps> = ({ boardId, title }) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/board/${boardId}`);
  };

  return (
    <Card
      onClick={handleClick}
      className="rounded-lg transition-all duration-200 overflow-hidden bg-linear-to-br from-blue-200 to-cyan-200 hover:shadow-md w-56 h-32 flex items-center justify-center cursor-pointer"
      aria-label={`Open board: ${title}`}
    >
      <h2 className="text-lg text-center mb-2 sm:text-base md:text-lg truncate">
        {title}
      </h2>
    </Card>
  );
};

export default BoardCard;
