"use client";

import { Role } from "@/lib/constants/role";
import {
  boardViewModeSignal,
  createBoardModalOpenSignal,
  sortedBoardsSignal,
} from "@/lib/signal/boardSignals";
import type { BoardWithRole } from "@/lib/types/board";
import { useSignals } from "@preact/signals-react/runtime";
import { Plus } from "lucide-react";
import BoardCard from "./BoardCard";
import BoardListItem from "./BoardListItem";

function NewBoardCard() {
  return (
    <button
      type="button"
      onClick={() => {
        createBoardModalOpenSignal.value = true;
      }}
      className="h-40 w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white transition-colors hover:border-[#94A3B8] hover:shadow-sm"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6366F1]">
        <Plus className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[15px] font-semibold text-[#0F172A]">
          Create new board
        </span>
        <span className="text-[12px] text-[#94A3B8]">
          Start a fresh retrospective
        </span>
      </div>
    </button>
  );
}

export default function BoardList() {
  useSignals();

  const boards = sortedBoardsSignal.value;

  const viewMode = boardViewModeSignal.value;

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[1.5px] text-[#94A3B8]">
          YOUR BOARDS
        </span>
        <span className="text-[13px] text-[#94A3B8]">
          {boards.length} {boards.length === 1 ? "board" : "boards"}
        </span>
      </div>

      {/* New board action — always above the grid/list */}
      <NewBoardCard />

      {/* Board items */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {boards.map((board: BoardWithRole) => (
            <BoardCard
              key={board.id}
              board={board}
              isOwner={board.role === Role.owner}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {boards.map((board: BoardWithRole) => (
            <BoardListItem
              key={board.id}
              board={board}
              isOwner={board.role === Role.owner}
            />
          ))}
        </div>
      )}
    </div>
  );
}
