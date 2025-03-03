"use client";

import { boardSignal } from "@/lib/signal/boardSignals";
import { useSignals } from "@preact/signals-react/runtime";
import BoardCard from "./BoardCard";

export default function BoardList() {
  useSignals();
  return (
    <>
      {boardSignal.value.map((board) => (
        <div key={board.id} className="flex items-center justify-center">
          <BoardCard boardId={board.id} title={board.title} />
        </div>
      ))}
    </>
  );
}
