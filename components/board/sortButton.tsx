"use client";

import { useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  TrendingUp,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type {
  SortButtonProps,
  SortOption,
  SortCriterion,
  SortDirection,
} from "@/lib/types/sort";
import { sortPosts } from "@/lib/signal/postSignals";

function getSortKey(
  criterion: SortCriterion,
  direction?: SortDirection
): string {
  if (criterion === "none") return "none";
  return `${criterion}@${direction || "desc"}`;
}

export default function SortButton({ className }: SortButtonProps) {
  const [currentSort, setCurrentSort] = useState<SortOption>({
    criterion: "none",
  });

  const handleSortChange = (value: string) => {
    let sortOption: SortOption;
    console.log("handleSortChange", value);

    if (value === "none") {
      sortOption = { criterion: "none" };
    } else {
      const [criterion, direction] = value.split("@") as [
        SortCriterion,
        SortDirection
      ];
      sortOption = { criterion, direction };
    }
    console.log("sortOption", sortOption);

    setCurrentSort(sortOption);
    sortPosts(sortOption.criterion, sortOption.direction);
  };

  const currentSortKey = getSortKey(
    currentSort.criterion,
    currentSort.direction
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`gap-1 ${className}`}
          aria-label={`Sort posts by ${currentSortKey}`}
        >
          <ArrowUpDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuRadioGroup
          value={currentSortKey}
          onValueChange={handleSortChange}
        >
          <DropdownMenuRadioItem
            value="none"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Default Order</span>
          </DropdownMenuRadioItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
            Creation Time
          </DropdownMenuLabel>
          <DropdownMenuRadioItem
            value="creation-time@desc"
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Newest First</span>
            <ChevronDown className="w-3 h-3 ml-auto opacity-60" />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="creation-time@asc"
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Oldest First</span>
            <ChevronUp className="w-3 h-3 ml-auto opacity-60" />
          </DropdownMenuRadioItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
            Vote Count
          </DropdownMenuLabel>
          <DropdownMenuRadioItem
            value="vote-count@desc"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Highest First</span>
            <ChevronDown className="w-3 h-3 ml-auto opacity-60" />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="vote-count@asc"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Lowest First</span>
            <ChevronUp className="w-3 h-3 ml-auto opacity-60" />
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
