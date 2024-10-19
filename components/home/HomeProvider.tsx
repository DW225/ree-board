"use client"

import React from "react";
import { boardSignalInitial } from "@/lib/signal/boardSignals";
import type { Board } from "@/db/schema";
import { useEffectOnce } from "@/lib/utils/effect";

interface HomeProviderProps {
  children: React.ReactNode;
  initialBoards: Board[];
}

export const HomeProvider: React.FC<HomeProviderProps> = ({
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
