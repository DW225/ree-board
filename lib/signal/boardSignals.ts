import { BoardState } from "@/lib/constants/board";
import type { Board, BoardWithRole } from "@/lib/types/board";
import type { SortDirection } from "@/lib/types/sort";
import { computed, signal } from "@preact/signals-react";

export type DateFilter = "thisWeek" | "thisMonth" | "last3Months" | "allTime";

// Core data signal - single source of truth
export const boardsSignal = signal<BoardWithRole[]>([]);

// UI state signals
export const boardSortCriteriaSignal = signal<{
  criterion: "title" | "createdAt" | "updatedAt";
  direction: SortDirection;
}>({
  criterion: "updatedAt",
  direction: "desc",
});

export const boardFilterSignal = signal<string>("");
export const boardStatusFilterSignal = signal<BoardState[]>([]);
export const boardDateFilterSignal = signal<DateFilter>("allTime");

// Computed signals for derived state
export const filteredBoardsSignal = computed(() => {
  const boards = boardsSignal.value;
  const textFilter = boardFilterSignal.value.toLowerCase();
  const statusFilter = boardStatusFilterSignal.value;
  const dateFilter = boardDateFilterSignal.value;

  return boards.filter((board) => {
    // Text search
    if (textFilter && !board.title.toLowerCase().includes(textFilter)) {
      return false;
    }

    // Status filter
    if (
      statusFilter.length > 0 &&
      !statusFilter.includes(board.state as BoardState)
    ) {
      return false;
    }

    // Date Created filter
    if (dateFilter !== "allTime") {
      const createdAt = new Date(board.createdAt).getTime();
      const now = Date.now();
      const DAY = 86_400_000;
      const cutoffs: Record<Exclude<DateFilter, "allTime">, number> = {
        thisWeek: now - 7 * DAY,
        thisMonth: now - 30 * DAY,
        last3Months: now - 90 * DAY,
      };
      if (createdAt < cutoffs[dateFilter]) return false;
    }

    return true;
  });
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
export const initializeBoardSignals = (boards: BoardWithRole[]) => {
  boardsSignal.value = boards;
};

// Action creators for board operations
export const addBoard = (newBoard: BoardWithRole) => {
  boardsSignal.value = [...boardsSignal.value, newBoard];
};

export const removeBoard = (boardId: Board["id"]) => {
  boardsSignal.value = boardsSignal.value.filter(
    (board) => board.id !== boardId,
  );
};

export const updateBoard = (updatedBoard: BoardWithRole) => {
  boardsSignal.value = boardsSignal.value.map((board) =>
    board.id === updatedBoard.id ? updatedBoard : board,
  );
};

export const updateBoardTitle = (
  boardId: Board["id"],
  newTitle: Board["title"],
) => {
  boardsSignal.value = boardsSignal.value.map((board) =>
    board.id === boardId
      ? { ...board, title: newTitle, updatedAt: new Date() }
      : board,
  );
};

// Sorting and filtering operations
export const sortBoards = (
  criterion: "title" | "createdAt" | "updatedAt",
  direction?: SortDirection,
) => {
  boardSortCriteriaSignal.value = {
    criterion,
    direction: direction ?? "desc",
  };
};

export const filterBoards = (filter: string) => {
  boardFilterSignal.value = filter;
};

export const setStatusFilter = (statuses: BoardState[]) => {
  boardStatusFilterSignal.value = statuses;
};

export const setDateFilter = (date: DateFilter) => {
  boardDateFilterSignal.value = date;
};

export const resetAllFilters = () => {
  boardFilterSignal.value = "";
  boardStatusFilterSignal.value = [];
  boardDateFilterSignal.value = "allTime";
};

// Legacy compatibility (deprecated - use initializeBoardSignals instead)
export const boardSignalInitial = initializeBoardSignals;

// Controls the Create Board modal open state - set to true from anywhere to open the modal
export const createBoardModalOpenSignal = signal(false);

// Controls grid vs list view — layout preference, intentionally excluded from resetAllFilters
export const boardViewModeSignal = signal<"grid" | "list">("grid");
