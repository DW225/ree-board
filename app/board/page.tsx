import DashboardSearch from "@/components/home/DashboardSearch";
import { BoardListSkeleton } from "@/components/ui/skeletons";
import { getCurrentUser, verifySession } from "@/lib/dal";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Your Boards",
  description: "View and manage all your retrospective boards",
};

const CreateBoardModal = dynamic(
  () => import("@/components/home/CreateBoardModal"),
);
const BoardListWrapper = dynamic(
  () => import("@/components/home/BoardListWrapper"),
);

function getTimeGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function Boards() {
  const [session, supabaseUser] = await Promise.all([
    verifySession(),
    getCurrentUser(),
  ]);

  const userID = session.userId;

  const fullName =
    (supabaseUser.user_metadata?.full_name as string | undefined) ??
    (supabaseUser.user_metadata?.name as string | undefined) ??
    supabaseUser.email?.split("@")[0] ??
    "";
  const firstName = fullName.split(" ")[0] || "there";
  const greeting = `${getTimeGreeting(new Date().getHours())}, ${firstName}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="flex flex-col gap-6 px-12 py-10">
        <h1 className="text-[28px] font-bold text-[#0F172A]">{greeting}</h1>
        <DashboardSearch />
        <Suspense fallback={<BoardListSkeleton />}>
          <BoardListWrapper userId={userID} />
        </Suspense>
      </main>
      <CreateBoardModal userID={userID} />
    </div>
  );
}
