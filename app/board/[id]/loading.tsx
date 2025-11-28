import {
  BoardGridSkeleton,
  BoardToolbarSkeleton,
} from "@/components/ui/skeletons";

/**
 * Loading skeleton for the individual board page.
 * Displays toolbar and board grid skeletons matching the actual layout.
 */
export default function BoardPageLoading() {
  return (
    <div className="container mx-auto w-full max-w-full px-4">
      <BoardToolbarSkeleton />
      <BoardGridSkeleton columnCount={4} postCount={3} />
    </div>
  );
}
