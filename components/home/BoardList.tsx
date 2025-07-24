"use client";

import { sortedBoardsSignal } from "@/lib/signal/boardSignals";
import type { Board } from "@/lib/types/board";
import { useSignals } from "@preact/signals-react/runtime";
import BoardCard from "./BoardCard";

export default function BoardList() {
  useSignals();
  return (
    <>
      {sortedBoardsSignal.value.map((board: Board) => (
        <div key={board.id} className="flex items-center justify-center">
          <BoardCard boardId={board.id} title={board.title} />
        </div>
      ))}
    </>
  );
}
