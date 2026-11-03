"use client";

import { boardSignalInitial } from "@/lib/signal/boardSignals";
import { BoardListSkeleton } from "@/components/ui/skeletons";
import type { BoardWithRole } from "@/lib/types/board";
import { useEffectOnce } from "@/lib/utils/effect";
import type { FC, ReactNode } from "react";
import { useState } from "react";

interface HomeProviderProps {
  children: ReactNode;
  initialBoards: BoardWithRole[];
}

const HomeProvider: FC<HomeProviderProps> = ({ children, initialBoards }) => {
  const [initialized, setInitialized] = useState(false);
  // Initialize the boardSignal with the initial data
  useEffectOnce(() => {
    boardSignalInitial(initialBoards);
    setInitialized(true);
  });

  return initialized ? <>{children}</> : <BoardListSkeleton />;
};

export default HomeProvider;
