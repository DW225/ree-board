import {
  BoardListSkeleton,
  PageTitleSkeleton,
} from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton component for the boards list page.
 * Displays a header placeholder, create form skeleton, and grid of board card skeletons.
 */
export default function BoardsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto mt-8 px-4">
        <PageTitleSkeleton className="mb-6" />
        <div className="flex flex-wrap gap-4">
          {/* Create board form skeleton */}
          <Skeleton className="w-56 h-32 rounded-lg bg-gray-100" />
          <BoardListSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
