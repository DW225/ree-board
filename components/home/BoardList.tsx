"use client";

import { Role } from "@/lib/constants/role";
import { sortedBoardsSignal } from "@/lib/signal/boardSignals";
import type { BoardWithRole } from "@/lib/types/board";
import { useSignals } from "@preact/signals-react/runtime";
import BoardCard from "./BoardCard";

export default function BoardList() {
  useSignals();

  if (sortedBoardsSignal.value.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          No boards yet
        </h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Create your first retrospective board to get started with your team.
        </p>
      </div>
    );
  }

  return (
    <>
      {sortedBoardsSignal.value.map((board: BoardWithRole) => {
        // Check if current user has owner role for this board
        const isOwner = board.role === Role.owner;

        return (
          <div key={board.id} className="flex items-center justify-center">
            <BoardCard board={board} isOwner={isOwner} />
          </div>
        );
      })}
    </>
  );
}
