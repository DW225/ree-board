import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

/**
 * Skeleton for a single board card
 */
export function BoardCardSkeleton() {
  return (
    <div className="w-64 h-40 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <Skeleton className="h-6 w-3/4 mb-3 bg-slate-200" />
      <Skeleton className="h-4 w-full mb-2 bg-slate-200" />
      <Skeleton className="h-4 w-5/6 bg-slate-200" />
    </div>
  );
}

/**
 * Skeleton for the board list grid
 */
export function BoardListSkeleton({ count = 4 }: Readonly<{ count?: number }>) {
  return (
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <BoardCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a single post card
 */
export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
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
    <div className="space-y-3">
      <Skeleton className="h-8 w-32 mb-4 bg-slate-200" />
      {Array.from({ length: postCount }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for the full board grid (3 columns)
 */
export function BoardGridSkeleton({
  columnCount = 3,
  postCount = 3,
}: Readonly<{
  columnCount?: number;
  postCount?: number;
}>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {Array.from({ length: columnCount }).map((_, i) => (
        <BoardColumnSkeleton key={i} postCount={postCount} />
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
    <div className="flex justify-end py-2 gap-2">
      <AvatarStackSkeleton />
      <ToolbarButtonSkeleton />
      <ToolbarButtonSkeleton />
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
