import { BoardState } from "@/lib/constants/board";
import { Role } from "@/lib/constants/role";
import type { BoardWithRole } from "@/lib/types/board";
import {
  boardsSignal,
  boardViewModeSignal,
  filterBoards,
  resetAllFilters,
  setDateFilter,
  setStatusFilter,
  setVisibilityFilter,
  sortBoards,
  sortedBoardsSignal,
  updateBoard,
} from "./boardSignals";

const recent = new Date("2026-10-12T00:00:00Z");
const board = (
  id: string,
  overrides: Partial<BoardWithRole> = {}
): BoardWithRole => ({
  id,
  title: `${id} retro`,
  description: null,
  visibility: "private",
  teamId: null,
  state: BoardState.active,
  creator: "owner",
  role: Role.owner,
  createdAt: recent,
  updatedAt: recent,
  ...overrides,
});
const ids = () => sortedBoardsSignal.value.map((entry) => entry.id);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-13T00:00:00Z"));
  resetAllFilters();
  sortBoards("title", "asc");
  boardsSignal.value = [
    board("alpha"),
    board("beta", { visibility: "team" }),
    board("gamma", { state: BoardState.archived }),
    board("older", { createdAt: new Date("2026-01-01T00:00:00Z") }),
    board("other", { title: "Planning" }),
  ];
});
afterEach(() => {
  jest.useRealTimers();
  resetAllFilters();
  boardsSignal.value = [];
  boardViewModeSignal.value = "grid";
});

it("filters private and team boards, and restores all boards", () => {
  setVisibilityFilter("private");
  expect(ids()).toEqual(["alpha", "gamma", "older", "other"]);
  setVisibilityFilter("team");
  expect(ids()).toEqual(["beta"]);
  setVisibilityFilter("all");
  expect(ids()).toHaveLength(5);
});

it("combines visibility with search, status, date, and sort", () => {
  filterBoards("RETRO");
  setStatusFilter([BoardState.active]);
  setDateFilter("thisWeek");
  setVisibilityFilter("private");
  expect(ids()).toEqual(["alpha"]);
  setVisibilityFilter("all");
  sortBoards("title", "desc");
  expect(ids()).toEqual(["beta", "alpha"]);
});

it("updates the filtered list after a saved visibility change and resets filters", () => {
  boardViewModeSignal.value = "list";
  setVisibilityFilter("team");
  updateBoard({ ...boardsSignal.value[1], visibility: "private" });
  expect(ids()).toEqual([]);
  resetAllFilters();
  expect(ids()).toHaveLength(5);
  expect(boardViewModeSignal.value).toBe("list");
});
