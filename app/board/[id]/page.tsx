import { BoardAccess, BoardGrid } from "@/components/board";
import { AnonymousModeProvider } from "@/components/board/AnonymousModeProvider";
import { PostProvider } from "@/components/board/PostProvider";
import { NavBar } from "@/components/common";
import { ToastSystem } from "@/components/common/ToastSystem";
import { Role } from "@/db/schema";
import { fetchMembersByBoardID } from "@/lib/db/member";
import { fetchPostsByBoardID } from "@/lib/db/post";
import { findUserIdByKindeID } from "@/lib/db/user";
import { fetchUserVotedPost } from "@/lib/db/vote";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

interface BoardPageProps {
  params: { id: string };
}

const RTLProvider = dynamic(() => import("@/components/board/RTLProvider"), {
  ssr: false,
});

const PostChannel = dynamic(
  () => import("@/components/board/PostChannelComponent"),
  {
    ssr: false,
  }
);

export default async function BoardPage({ params }: Readonly<BoardPageProps>) {
  const boardID = params.id;

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    redirect("/api/auth/login");
  }

  const [userID, posts, members] = await Promise.all([
    findUserIdByKindeID(user.id),
    fetchPostsByBoardID(boardID),
    fetchMembersByBoardID(boardID),
  ]);

  if (!userID) {
    throw new Error("User not found");
  }

  const votedPosts = await fetchUserVotedPost(userID);

  const role = members.find((m) => m.userId === userID)?.role;

  if (role === undefined) {
    redirect("/board");
  }
  const viewOnly = role === Role.guest;

  const initialData = {
    posts,
    members,
    votedPosts,
  };

  return (
    <>
      <NavBar />
      <RTLProvider boardId={boardID}>
        <AnonymousModeProvider>
          <PostProvider initials={initialData}>
            <PostChannel boardId={boardID} userId={userID} />
            <div className="container mx-auto w-full max-w-full px-4">
              <div className="flex justify-end">
                <BoardAccess boardId={boardID} role={role} members={members} />
              </div>
              <BoardGrid
                boardID={boardID}
                viewOnly={viewOnly}
                userId={userID}
              />
            </div>
          </PostProvider>
        </AnonymousModeProvider>
      </RTLProvider>
      <ToastSystem />
    </>
  );
}
