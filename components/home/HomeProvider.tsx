"use client";

import { boardSignalInitial } from "@/lib/signal/boardSignals";
import type { BoardWithRole } from "@/lib/types/board";
import { useEffectOnce } from "@/lib/utils/effect";
import type { FC, ReactNode } from "react";

interface HomeProviderProps {
  children: ReactNode;
  initialBoards: BoardWithRole[];
}

const HomeProvider: FC<HomeProviderProps> = ({ children, initialBoards }) => {
  // Initialize the boardSignal with the initial data
  useEffectOnce(() => {
    boardSignalInitial(initialBoards);
  });

  return <>{children}</>;
};

export default HomeProvider;
