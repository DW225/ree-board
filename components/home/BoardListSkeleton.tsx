"use client";

import { BoardListSkeleton as BoardListLayoutSkeleton } from "@/components/ui/skeletons";
import { boardViewModeSignal } from "@/lib/signal/boardSignals";
import { useSignals } from "@preact/signals-react/runtime";

export default function BoardListSkeleton() {
  useSignals();
  return <BoardListLayoutSkeleton viewMode={boardViewModeSignal.value} />;
}
