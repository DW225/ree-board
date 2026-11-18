import BoardListSkeleton from "@/components/home/BoardListSkeleton";
import DashboardSearch from "@/components/home/DashboardSearch";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton component for the boards list page.
 * Keeps the dashboard controls and content in their final positions.
 */
export default function BoardsLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="flex flex-col gap-6 px-12 py-10">
        <Skeleton className="h-[42px] w-80 max-w-full bg-slate-200" />
        <DashboardSearch />
        <BoardListSkeleton />
      </main>
    </div>
  );
}
