import type { Board } from "@/lib/types/board";
import type { SortDirection } from "@/lib/types/sort";
import { computed, signal } from "@preact/signals-react";

// Core data signal - single source of truth
export const boardsSignal = signal<Board[]>([]);

// UI state signals
export const boardSortCriteriaSignal = signal<{
  criterion: "title" | "createdAt" | "updatedAt";
  direction: SortDirection;
}>({
  criterion: "createdAt",
  direction: "desc",
});

export const boardFilterSignal = signal<string>("");

// Computed signals for derived state
export const filteredBoardsSignal = computed(() => {
  const boards = boardsSignal.value;
  const filter = boardFilterSignal.value.toLowerCase();

  if (!filter) return boards;

  return boards.filter((board) => board.title.toLowerCase().includes(filter));
});

export const sortedBoardsSignal = computed(() => {
  const boards = filteredBoardsSignal.value;
  const { criterion, direction } = boardSortCriteriaSignal.value;

  const sortedBoards = [...boards].sort((a, b) => {
    let comparison = 0;

    switch (criterion) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "createdAt": {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
          return 0;
        }
        comparison = dateA.getTime() - dateB.getTime();
        break;
      }
      case "updatedAt": {
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
          return 0;
        }
        comparison = dateA.getTime() - dateB.getTime();
        break;
      }
      default:
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sortedBoards;
});

// Initialization function
export const initializeBoardSignals = (boards: Board[]) => {
  boardsSignal.value = boards;
};

// Action creators for board operations
export const addBoard = (newBoard: Board) => {
  boardsSignal.value = [...boardsSignal.value, newBoard];
};

export const removeBoard = (boardId: Board["id"]) => {
  boardsSignal.value = boardsSignal.value.filter(
    (board) => board.id !== boardId
  );
};

export const updateBoard = (updatedBoard: Board) => {
  boardsSignal.value = boardsSignal.value.map((board) =>
    board.id === updatedBoard.id ? updatedBoard : board
  );
};

export const updateBoardTitle = (
  boardId: Board["id"],
  newTitle: Board["title"]
) => {
  boardsSignal.value = boardsSignal.value.map((board) =>
    board.id === boardId
      ? { ...board, title: newTitle, updatedAt: new Date() }
      : board
  );
};

// Sorting and filtering operations
export const sortBoards = (
  criterion: "title" | "createdAt" | "updatedAt",
  direction?: SortDirection
) => {
  boardSortCriteriaSignal.value = {
    criterion,
    direction: direction ?? "desc",
  };
};

export const filterBoards = (filter: string) => {
  boardFilterSignal.value = filter;
};

// Legacy compatibility (deprecated - use initializeBoardSignals instead)
export const boardSignalInitial = initializeBoardSignals;
