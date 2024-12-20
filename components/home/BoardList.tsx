"use client";

import { boardSignal } from "@/lib/signal/boardSignals";
import React from "react";
import BoardCard from "./BoardCard";
import { useSignals } from "@preact/signals-react/runtime";

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
