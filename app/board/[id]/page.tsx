import { Suspense } from "react";
import dynamic from "next/dynamic";
import {
  BoardGridSkeleton,
  BoardToolbarSkeleton,
} from "@/components/ui/skeletons";

const BoardContentWrapper = dynamic(
  () => import("@/components/board/BoardContentWrapper")
);

type BoardPageParams = Promise<{ id: string }>;

/**
 * Board page skeleton shown while the BoardContentWrapper streams in.
 * Displays toolbar and grid skeletons to match the final layout.
 */
function BoardPageSkeleton() {
  return (
    <div className="container mx-auto w-full max-w-full px-4">
      <BoardToolbarSkeleton />
      <BoardGridSkeleton columnCount={4} postCount={3} />
    </div>
  );
}

export default async function BoardPage({
  params,
}: Readonly<{
  params: BoardPageParams;
}>) {
  const { id } = await params;

  return (
    <Suspense fallback={<BoardPageSkeleton />}>
      <BoardContentWrapper boardId={id} />
    </Suspense>
  );
}
