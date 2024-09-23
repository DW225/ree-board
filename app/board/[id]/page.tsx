import { BoardAccess, BoardGrid } from "@/components/board";
import { PostProvider } from "@/components/board/PostProvider";
import { NavBar } from "@/components/common";
import { checkMemberRole, fetchMembersByBoardID } from "@/lib/db/member";
import { fetchPostsByBoardID } from "@/lib/db/post";
import { findUserIdByKindeID } from "@/lib/db/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

interface BoardPageProps {
  params: { id: string };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const boardID = params.id;

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {
    redirect("/api/auth/login");
  }
  const userID = await findUserIdByKindeID(user.id);

  if (!userID) {
    throw new Error("User not found");
  }

  const role = await checkMemberRole(userID, boardID);

  if (role === null) {
    redirect("/boards");
  }

  const posts = await fetchPostsByBoardID(boardID);
  const members = await fetchMembersByBoardID(boardID);

  return (
    <>
      <NavBar />
      <PostProvider initialPosts={posts} initialMembers={members}>
        <div className="container mx-auto w-full max-w-full px-4">
          <div className="flex justify-end">
            <BoardAccess boardId={boardID} role={role} />
          </div>
          <BoardGrid boardID={boardID} />
        </div>
      </PostProvider>
    </>
  );
}
