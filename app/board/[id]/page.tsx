import { Role } from "@/db/schema";
import { fetchTasks } from "@/lib/db/task";
import { fetchMembersByBoardID } from "@/lib/db/member";
import { fetchPostsByBoardID } from "@/lib/db/post";
import { findUserIdByKindeID } from "@/lib/db/user";
import { fetchUserVotedPost } from "@/lib/db/vote";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

const AvatarStack = dynamic(() =>
  import("@/components/board/AvatarStack").then((mod) => mod.AvatarStack)
);
const BoardGrid = dynamic(() => import("@/components/board/BoardGrid"));
const AnonymousModeProvider = dynamic(
  () => import("@/components/board/AnonymousModeProvider")
);
const PostProvider = dynamic(() => import("@/components/board/PostProvider"));
const MemberManageModalComponent = dynamic(
  () => import("@/components/board/MemberManageModalComponent")
);
const ToastSystem = dynamic(() => import("@/components/common/ToastSystem"));
const RTLProvider = dynamic(() => import("@/components/board/RTLProvider"), {
  ssr: false,
});
const PostChannel = dynamic(
  () => import("@/components/board/PostChannelComponent"),
  {
    ssr: false,
  }
);

interface BoardPageProps {
  params: { id: string };
}

export default async function BoardPage({ params }: Readonly<BoardPageProps>) {
  const boardID = params.id;

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    redirect("/api/auth/login");
  }

  const [userID, posts, members, actions] = await Promise.all([
    findUserIdByKindeID(user.id),
    fetchPostsByBoardID(boardID),
    fetchMembersByBoardID(boardID),
    fetchTasks(boardID),
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
  const hasManagePermission = role === Role.owner;

  const initialData = {
    posts,
    members,
    votedPosts,
    actions,
  };

  return (
    <>
      <RTLProvider boardId={boardID}>
        <AnonymousModeProvider>
          <PostProvider
            initials={initialData}
            boardId={boardID}
            userId={userID}
          >
            <PostChannel boardId={boardID} userId={userID} />
            <div className="container mx-auto w-full max-w-full px-4">
              <div className="flex justify-end py-2">
                <MemberManageModalComponent
                  boardId={boardID}
                  viewOnly={!hasManagePermission}
                >
                  <AvatarStack />
                </MemberManageModalComponent>
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
