export type SortCriterion = "none" | "creation-time" | "vote-count";
export type SortDirection = "asc" | "desc";

export interface SortOption {
  criterion: SortCriterion;
  direction?: SortDirection;
}

export interface SortButtonProps {
  className?: string;
}
