import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

/**
 * Skeleton for a single board card
 */
export function BoardCardSkeleton() {
  return (
    <div className="flex h-40 w-full flex-col overflow-hidden rounded-xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <Skeleton className="h-1 w-full rounded-none bg-slate-200" />
      <div className="flex flex-1 flex-col gap-1.5 px-4 py-3">
        <Skeleton className="h-6 w-3/4 bg-slate-200" />
        <Skeleton className="h-4 w-24 bg-slate-200" />
        <div className="flex-1" />
        <Skeleton className="h-5 w-12 self-end rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the dashboard's board section in either view mode.
 */
export function BoardListSkeleton({
  count = 4,
  viewMode = "grid",
}: Readonly<{ count?: number; viewMode?: "grid" | "list" }>) {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-label="Loading boards"
    >
      <div className="flex items-center justify-between" aria-hidden="true">
        <Skeleton className="h-[19.5px] w-24 bg-slate-200" />
        <Skeleton className="h-[19.5px] w-12 bg-slate-200" />
      </div>
      <Skeleton
        className="h-40 w-full rounded-xl bg-slate-200"
        aria-hidden="true"
      />
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            : "flex flex-col gap-2"
        }
        aria-hidden="true"
      >
        {Array.from({ length: count }).map((_, i) =>
          viewMode === "grid" ? (
            <BoardCardSkeleton key={i} />
          ) : (
            <div
              key={i}
              className="flex h-14 w-full items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white px-4"
            >
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-4 w-1/3 bg-slate-200" />
                <Skeleton className="h-3 w-24 bg-slate-200" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full bg-slate-200" />
            </div>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton for a single post card
 */
export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-4">
      <Skeleton className="h-5 w-3/4 mb-3 bg-slate-200" />
      <Skeleton className="h-4 w-full mb-2 bg-slate-200" />
      <Skeleton className="h-4 w-5/6 mb-3 bg-slate-200" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-12 bg-slate-200" />
        <Skeleton className="h-6 w-6 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a board column with posts
 */
export function BoardColumnSkeleton({
  postCount = 3,
}: Readonly<{ postCount?: number }>) {
  return (
    <div className="w-full flex flex-col bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      <Skeleton className="h-1 w-full rounded-none bg-slate-200" />
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <Skeleton className="h-5 w-24 bg-slate-200" />
        <Skeleton className="h-5 w-5 rounded-full bg-slate-200" />
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
        <Skeleton className="h-[38px] w-full bg-slate-200" />
        {Array.from({ length: postCount }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Uses the same one/two/four-column layout as BoardGrid.
 */
export function BoardGridSkeleton({
  columnCount = 4,
  postCount = 3,
}: Readonly<{
  columnCount?: number;
  postCount?: number;
}>) {
  return (
    <div className="flex flex-wrap -mx-2" aria-hidden="true">
      {Array.from({ length: columnCount }).map((_, i) => (
        <div key={i} className="h-full w-full md:w-1/2 lg:w-1/4 px-1 mb-4">
          <BoardColumnSkeleton postCount={postCount} />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for avatar stack
 */
export function AvatarStackSkeleton({
  count = 3,
}: Readonly<{ count?: number }>) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="w-8 h-8 rounded-full bg-slate-200" />
      ))}
    </div>
  );
}

/**
 * Skeleton for toolbar button
 */
export function ToolbarButtonSkeleton({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <Skeleton className={cn("w-10 h-10 rounded-md bg-slate-200", className)} />
  );
}

/**
 * Skeleton for the board page header toolbar
 */
export function BoardToolbarSkeleton() {
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3 py-3"
      aria-hidden="true"
    >
      <AvatarStackSkeleton />
      <ToolbarButtonSkeleton />
      <ToolbarButtonSkeleton />
    </div>
  );
}

export function BoardPageSkeleton() {
  return (
    <div
      className="container mx-auto w-full max-w-full px-4"
      role="status"
      aria-label="Loading board"
    >
      <BoardToolbarSkeleton />
      <BoardGridSkeleton />
    </div>
  );
}

/**
 * Skeleton for the board page title
 */
export function PageTitleSkeleton({
  className,
}: Readonly<{ className?: string }>) {
  return <Skeleton className={cn("h-9 w-48 bg-slate-200", className)} />;
}

/**
 * Skeleton for the profile page
 */
export function ProfileSkeleton() {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-4">
      <Skeleton className="h-8 w-32 mb-4 bg-slate-200" />
      <div className="mb-6">
        <Skeleton className="h-6 w-20 mb-2 bg-slate-200" />
        <div className="flex items-center mb-4">
          <Skeleton className="w-16 h-16 rounded-full mr-4 bg-slate-200" />
          <div>
            <Skeleton className="h-5 w-32 mb-2 bg-slate-200" />
            <Skeleton className="h-4 w-48 bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page loading spinner (for root loading)
 */
export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-slate-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-slate-600 text-lg">Loading...</p>
      </div>
    </div>
  );
}
