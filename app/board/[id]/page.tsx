import { Suspense } from "react";
import dynamic from "next/dynamic";
import { BoardPageSkeleton } from "@/components/ui/skeletons";

const BoardContentWrapper = dynamic(
  () => import("@/components/board/BoardContentWrapper")
);

type BoardPageParams = Promise<{ id: string }>;

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
