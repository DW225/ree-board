import { verifySession } from "@/lib/dal";
import { BoardListSkeleton } from "@/components/ui/skeletons";
import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Your Boards",
  description: "View and manage all your retrospective boards",
};

const CreateBoardForm = dynamic(
  () => import("@/components/home/CreateBoardForm")
);
const BoardListWrapper = dynamic(
  () => import("@/components/home/BoardListWrapper")
);

export default async function Boards() {
  // Verify session using centralized DAL
  const session = await verifySession();

  // Use userId directly from session (no need to fetch from DB)
  const userID = session.userId;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto mt-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Your Boards</h1>
        <div className="flex flex-wrap gap-4">
          <CreateBoardForm userID={userID} />
          <Suspense fallback={<BoardListSkeleton />}>
            <BoardListWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
