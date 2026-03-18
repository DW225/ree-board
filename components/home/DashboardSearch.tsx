"use client";

import FilterPanel from "@/components/home/FilterPanel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BoardState } from "@/lib/constants/board";
import {
  boardDateFilterSignal,
  boardFilterSignal,
  boardSortCriteriaSignal,
  boardStatusFilterSignal,
  boardViewModeSignal,
  filterBoards,
  resetAllFilters,
  setDateFilter,
  setStatusFilter,
  sortBoards,
  type DateFilter,
} from "@/lib/signal/boardSignals";
import { useSignals } from "@preact/signals-react/runtime";
import {
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useState } from "react";

type SortOption = {
  label: string;
  criterion: "title" | "createdAt" | "updatedAt";
  direction: "asc" | "desc";
};

const SORT_OPTIONS: SortOption[] = [
  { label: "Recent", criterion: "updatedAt", direction: "desc" },
  { label: "Oldest", criterion: "createdAt", direction: "asc" },
  { label: "A-Z", criterion: "title", direction: "asc" },
  { label: "Z-A", criterion: "title", direction: "desc" },
];

const DATE_LABELS: Record<Exclude<DateFilter, "allTime">, string> = {
  thisWeek: "This Week",
  thisMonth: "This Month",
  last3Months: "Last 3 Months",
};

const STATUS_LABELS: Record<BoardState, string> = {
  [BoardState.active]: "Active",
  [BoardState.archived]: "Archived",
};

function getCurrentSortLabel(criterion: string, direction: string): string {
  const match = SORT_OPTIONS.find(
    (o) => o.criterion === criterion && o.direction === direction,
  );
  return match?.label ?? "Recent";
}

function Chip({ label, onRemove }: Readonly<{ label: string; onRemove: () => void }>) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1">
      <span className="text-[12px] font-medium text-[#4F46E5]">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
      >
        <X className="h-3 w-3 text-[#6366F1]" />
      </button>
    </div>
  );
}

export default function DashboardSearch() {
  useSignals();

  const [filterOpen, setFilterOpen] = useState(false);

  const textFilter = boardFilterSignal.value;
  const statusFilter = boardStatusFilterSignal.value;
  const dateFilter = boardDateFilterSignal.value;
  const { criterion, direction } = boardSortCriteriaSignal.value;
  const sortLabel = getCurrentSortLabel(criterion, direction);

  const hasAnyFilter =
    textFilter.length > 0 ||
    statusFilter.length > 0 ||
    dateFilter !== "allTime";

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar row */}
      <div className="flex items-center gap-3">
        {/* Filter button with popover */}
        <PopoverPrimitive.Root open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverPrimitive.Trigger asChild>
            <Button
              variant="outline"
              data-state={filterOpen ? "open" : "closed"}
              className="shrink-0 gap-2 rounded-lg border-[#E2E8F0] bg-white px-4 py-2.5 text-[#374151] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-slate-50 hover:text-[#374151] data-[state=open]:border-indigo-300 data-[state=open]:bg-indigo-50"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#64748B]" />
              Filter
            </Button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={8}
              className="z-50"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <FilterPanel onClose={() => setFilterOpen(false)} />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search boards by name..."
            value={textFilter}
            onChange={(e) => filterBoards(e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="shrink-0 gap-2 rounded-lg border-[#E2E8F0] bg-white px-4 py-2.5 text-[#374151] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-slate-50 hover:text-[#374151]"
            >
              <ArrowUpDown className="h-4 w-4 text-[#64748B]" />
              Sort: {sortLabel}
              <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.label}
                onClick={() => sortBoards(option.criterion, option.direction)}
                className="cursor-pointer"
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <div className="flex shrink-0 items-center rounded-lg border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <Button
            variant="ghost"
            aria-label="Grid view"
            onClick={() => (boardViewModeSignal.value = "grid")}
            className={`rounded-l-lg rounded-r-none px-3 py-2.5 ${boardViewModeSignal.value === "grid" ? "bg-[#F1F5F9] text-[#374151] hover:bg-[#F1F5F9] hover:text-[#374151]" : "text-[#94A3B8] hover:text-[#374151]"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            aria-label="List view"
            onClick={() => (boardViewModeSignal.value = "list")}
            className={`rounded-l-none rounded-r-lg px-3 py-2.5 ${boardViewModeSignal.value === "list" ? "bg-[#F1F5F9] text-[#374151] hover:bg-[#F1F5F9] hover:text-[#374151]" : "text-[#94A3B8] hover:text-[#374151]"}`}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-[#64748B]">
            Active filters:
          </span>

          {textFilter && (
            <Chip label={`"${textFilter}"`} onRemove={() => filterBoards("")} />
          )}

          {statusFilter.map((status) => (
            <Chip
              key={status}
              label={STATUS_LABELS[status]}
              onRemove={() =>
                setStatusFilter(statusFilter.filter((s) => s !== status))
              }
            />
          ))}

          {dateFilter !== "allTime" && (
            <Chip
              label={DATE_LABELS[dateFilter]}
              onRemove={() => setDateFilter("allTime")}
            />
          )}

          <Button
            variant="ghost"
            onClick={resetAllFilters}
            className="h-auto px-0 py-0 text-[13px] font-medium text-[#94A3B8] hover:bg-transparent hover:text-[#64748B]"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
