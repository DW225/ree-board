"use client"

import { boardSignalInitial } from "@/lib/signal/boardSignals";
import type { Board } from "@/lib/types";
import { useEffectOnce } from "@/lib/utils/effect";
import React from "react";

interface HomeProviderProps {
  children: React.ReactNode;
  initialBoards: Board[];
}

const HomeProvider: React.FC<HomeProviderProps> = ({
  children,
  initialBoards,
}) => {

  // Initialize the boardSignal with the initial data
  useEffectOnce(() => {
    boardSignalInitial(initialBoards);
  });

  return (
    <>
      {children}
    </>
  );
};

export default HomeProvider;
