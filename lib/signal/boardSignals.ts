import type { Board } from "@/db/schema";
import { signal } from "@preact/signals-react";

// Create a signal to store the boards
export const boardSignal = signal<Board[]>([]);

export const boardSignalInitial = (boards: Board[]) => {
  boardSignal.value = boards;
};

export const addBoard = (newBoard: Board) => {
  boardSignal.value = [...boardSignal.value, newBoard];
};

export const removeBoard = (boardId: Board["id"]) => {
  const index = boardSignal.value.findIndex((board) => board.id === boardId);
  if (index !== -1) {
    boardSignal.value = [
      ...boardSignal.value.slice(0, index),
      ...boardSignal.value.slice(index + 1),
    ];
  }
};
