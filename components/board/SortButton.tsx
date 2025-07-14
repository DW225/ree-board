"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sortPosts } from "@/lib/signal/postSignals";
import type {
  SortButtonProps,
  SortCriterion,
  SortDirection,
  SortOption,
} from "@/lib/types/sort";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

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

    if (value === "none") {
      sortOption = { criterion: "none" };
    } else {
      const parts = value.split("@");
      if (parts.length !== 2) {
        console.error(`Invalid sort value format: ${value}`);
        return;
      }
      const [criterionStr, directionStr] = parts;
      const validCriteria: SortCriterion[] = ["creation-time", "vote-count"];
      const validDirections: SortDirection[] = ["asc", "desc"];

      if (
        !validCriteria.includes(criterionStr as SortCriterion) ||
        !validDirections.includes(directionStr as SortDirection)
      ) {
        console.error(`Invalid sort criterion or direction: ${value}`);
        return;
      }

      const criterion = criterionStr as SortCriterion;
      const direction = directionStr as SortDirection;
      sortOption = { criterion, direction };
    }

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
          size="icon"
          className={cn("gap-1", className)}
          aria-label={`Sort posts. Currently sorted by ${
            currentSort.criterion === "none"
              ? "default order"
              : currentSort.criterion
          }`}
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
