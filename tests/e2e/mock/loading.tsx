import BoardPageLoading from "@/app/board/[id]/loading";
import BoardsLoading from "@/app/board/(list)/loading";
import BoardGrid from "@/components/board/BoardGrid";
import BoardList from "@/components/home/BoardList";
import DashboardSearch from "@/components/home/DashboardSearch";
import HomeProvider from "@/components/home/HomeProvider";
import BoardListSkeleton from "@/components/home/BoardListSkeleton";
import { BoardState } from "@/lib/constants/board";
import { Role } from "@/lib/constants/role";
import type { BoardWithRole } from "@/lib/types/board";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

const boards: BoardWithRole[] = Array.from({ length: 4 }, (_, index) => ({
  id: `loading-board-${index}`,
  title: `Board ${index + 1}`,
  description: "",
  visibility: "private",
  teamId: null,
  state: BoardState.active,
  role: Role.owner,
  creator: "mock-member",
  createdAt: new Date("2026-09-07T00:00:00Z"),
  updatedAt: new Date("2026-09-07T00:00:00Z"),
}));

const router = {
  bfcacheId: "loading-fixture",
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

export default function LoadingFixture({
  params,
}: Readonly<{ params: URLSearchParams }>) {
  const stage = params.get("stage");

  let content = <BoardsLoading />;
  if (params.get("view") === "board") {
    content =
      stage === "ready" ? (
        <div className="container mx-auto w-full max-w-full px-4">
          <div className="flex flex-wrap items-center justify-end gap-3 py-3">
            <div className="h-10 w-10" />
          </div>
          <BoardGrid boardId="mock" userId="mock-member" viewOnly />
        </div>
      ) : (
        <BoardPageLoading />
      );
  } else if (stage !== "route") {
    content = (
      <div className="min-h-screen bg-[#F8FAFC]">
        <main className="flex flex-col gap-6 px-12 py-10">
          <h1 className="truncate text-[28px] font-bold text-[#0F172A]">
            Welcome back, Alexandria
          </h1>
          <DashboardSearch />
          {stage === "content" ? (
            <BoardListSkeleton />
          ) : (
            <HomeProvider initialBoards={boards}>
              <BoardList />
            </HomeProvider>
          )}
        </main>
      </div>
    );
  }

  return (
    <AppRouterContext.Provider value={router}>
      <div data-testid="loading-layout">{content}</div>
    </AppRouterContext.Provider>
  );
}
