import { fetchBoards } from "@/lib/db/board";
import { findUserIdByKindeID } from "@/lib/db/user";
import { retryWithBackoff } from "@/lib/utils/retryWithBackoff";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

const BoardList = dynamic(() => import("@/components/home/BoardList"));
const CreateBoardForm = dynamic(() => import("@/components/home/CreateBoardForm"));
const HomeProvider = dynamic(() => import("@/components/home/HomeProvider"));

export default async function Boards() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {
    redirect("/api/auth/login");
  }

  const [initialBoardList, userID] = await retryWithBackoff(
    async () => {
      const [boards, id] = await Promise.all([
        fetchBoards(user.id),
        findUserIdByKindeID(user.id),
      ]);
      if (!id) {
        throw new Error("User not found");
      }
      return [boards, id];
    },
    { maxRetries: 3, initialDelay: 500 }
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto mt-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Your Boards</h1>
        <div className="flex flex-wrap gap-4">
          <HomeProvider initialBoards={initialBoardList}>
            <CreateBoardForm userID={userID} />
            <BoardList />
          </HomeProvider>
        </div>
      </div>
    </div>
  );
}
