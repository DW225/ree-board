export type SortCriterion = "none" | "creation-time" | "vote-count";
export type SortDirection = "asc" | "desc";

export interface SortCriteria {
  criterion: "title" | "createdAt" | "updatedAt";
  direction: SortDirection;
}

export interface SortOption {
  criterion: SortCriterion;
  direction?: SortDirection;
}

export interface SortButtonProps {
  className?: string;
}
