export enum BoardState {
  active,
  archived,
}

export const BOARD_VISIBILITIES = ["team", "private"] as const;
export const BOARD_DESCRIPTION_MAX_LENGTH = 2000;
