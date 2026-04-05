"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BoardState } from "@/lib/constants/board";
import {
  boardDateFilterSignal,
  boardSortCriteriaSignal,
  boardStatusFilterSignal,
  setDateFilter,
  setStatusFilter,
  sortBoards,
  type DateFilter,
} from "@/lib/signal/boardSignals";
import type { SortCriteria } from "@/lib/types/sort";
import { useSignals } from "@preact/signals-react/runtime";
import { Check, X } from "lucide-react";
import { useState } from "react";

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: "This Week", value: "thisWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last 3 Months", value: "last3Months" },
  { label: "All Time", value: "allTime" },
];

const SORT_OPTIONS: {
  label: string;
  criterion: SortCriteria["criterion"];
  direction: SortCriteria["direction"];
}[] = [
  { label: "Recently Created", criterion: "createdAt", direction: "desc" },
  { label: "Last Modified", criterion: "updatedAt", direction: "desc" },
  { label: "Name A-Z", criterion: "title", direction: "asc" },
  { label: "Name Z-A", criterion: "title", direction: "desc" },
];

interface FilterPanelProps {
  onClose: () => void;
}

export default function FilterPanel({ onClose }: Readonly<FilterPanelProps>) {
  useSignals();

  const [pendingStatus, setPendingStatus] = useState<BoardState[]>(
    boardStatusFilterSignal.value,
  );
  const [pendingDate, setPendingDate] = useState<DateFilter>(
    boardDateFilterSignal.value,
  );
  const [pendingSort, setPendingSort] = useState<SortCriteria>(
    boardSortCriteriaSignal.value,
  );

  const toggleStatus = (status: BoardState) => {
    setPendingStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const handleApply = () => {
    setStatusFilter(pendingStatus);
    setDateFilter(pendingDate);
    sortBoards(pendingSort.criterion, pendingSort.direction);
    onClose();
  };

  const handleReset = () => {
    setPendingStatus([]);
    setPendingDate("allTime");
    setPendingSort({ criterion: "updatedAt", direction: "desc" });
    setStatusFilter([]);
    setDateFilter("allTime");
    sortBoards("updatedAt", "desc");
    onClose();
  };

  return (
    <div className="w-[280px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.15),0_1px_3px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <span className="text-[15px] font-semibold text-[#0F172A]">
          Filter Boards
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close filter panel"
          className="h-7 w-7 bg-[#F1F5F9] text-[#64748B] hover:bg-slate-200 hover:text-[#64748B]"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="h-px bg-[#E2E8F0]" />

      {/* Status section */}
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        <span className="text-[11px] font-semibold tracking-[1.2px] text-[#475569]">
          STATUS
        </span>
        {([BoardState.active, BoardState.archived] as const).map((status) => {
          const label = status === BoardState.active ? "Active" : "Archived";
          return (
            <div key={status} className="flex items-center gap-2">
              <Checkbox
                id={`status-${status}`}
                checked={pendingStatus.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              />
              <label
                htmlFor={`status-${status}`}
                className="cursor-pointer select-none text-[13px] text-[#334155]"
              >
                {label}
              </label>
            </div>
          );
        })}
      </div>

      <div className="h-px bg-[#E2E8F0]" />

      {/* Date Created section */}
      <div className="flex flex-col gap-0.5 px-4 py-3.5">
        <span className="mb-1.5 text-[11px] font-semibold tracking-[1.2px] text-[#475569]">
          DATE CREATED
        </span>
        {DATE_OPTIONS.map((opt) => {
          const isSelected = pendingDate === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPendingDate(opt.value)}
              className={`flex items-center justify-between rounded-md px-1 py-2 text-left transition-colors ${
                isSelected
                  ? "bg-[#EEF2FF] font-medium text-[#4F46E5]"
                  : "text-[#334155] hover:bg-slate-50"
              }`}
            >
              <span className="text-[13px]">{opt.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-[#4F46E5]" />}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-[#E2E8F0]" />

      {/* Sort By section */}
      <div className="flex flex-col gap-0.5 px-4 py-3.5">
        <span className="mb-1.5 text-[11px] font-semibold tracking-[1.2px] text-[#475569]">
          SORT BY
        </span>
        {SORT_OPTIONS.map((opt) => {
          const isSelected =
            pendingSort.criterion === opt.criterion &&
            pendingSort.direction === opt.direction;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() =>
                setPendingSort({
                  criterion: opt.criterion,
                  direction: opt.direction,
                })
              }
              className={`flex items-center justify-between rounded-md px-1 py-2 text-left transition-colors ${
                isSelected
                  ? "bg-[#EEF2FF] font-medium text-[#4F46E5]"
                  : "text-[#334155] hover:bg-slate-50"
              }`}
            >
              <span className="text-[13px]">{opt.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-[#4F46E5]" />}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] px-4 py-3">
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          className="bg-[#6366F1] text-white hover:bg-[#4F46E5]"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
