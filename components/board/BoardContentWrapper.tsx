import { Role } from "@/lib/constants/role";
import { fetchMembersByBoardID } from "@/lib/db/member";
import { fetchPostsByBoardID } from "@/lib/db/post";
import { fetchTasks } from "@/lib/db/task";
import { findUserIdByKindeID } from "@/lib/db/user";
import { fetchUserVotedPost } from "@/lib/db/vote";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

// Critical path components
const BoardGrid = dynamic(() => import("@/components/board/BoardGrid"));
const AnonymousModeProvider = dynamic(
  () => import("@/components/board/AnonymousModeProvider")
);
const PostProvider = dynamic(() => import("@/components/board/PostProvider"));
const RTLProvider = dynamic(() => import("@/components/board/RTLProvider"));
const PostChannel = dynamic(
  () => import("@/components/board/PostChannelComponent")
);

// Secondary features - lazy load with loading states
const AvatarStack = dynamic(
  () => import("@/components/board/AvatarStack").then((mod) => mod.AvatarStack),
  {
    loading: () => (
      <div className="flex -space-x-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
      </div>
    ),
  }
);

const MemberManageModalComponent = dynamic(
  () => import("@/components/board/MemberManageModalComponent"),
  {
    loading: () => (
      <div className="flex -space-x-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
      </div>
    ),
  }
);

const SortButton = dynamic(() => import("@/components/board/SortButton"), {
  loading: () => (
    <div className="w-10 h-10 rounded-md bg-gray-200 animate-pulse" />
  ),
});

const LinkButton = dynamic(
  () => import("@/components/board/MagicLink/LinkButton"),
  {
    loading: () => (
      <div className="w-10 h-10 rounded-md bg-gray-200 animate-pulse" />
    ),
  }
);

interface BoardContentWrapperProps {
  boardId: string;
}

/**
 * Server component wrapper that fetches board data and renders the full board content.
 * This allows the board to be streamed independently using Suspense while showing
 * a skeleton placeholder.
 */
export default async function BoardContentWrapper({
  boardId,
}: Readonly<BoardContentWrapperProps>) {
  // Verify session using centralized DAL
  const session = await verifySession();

  const [userID, posts, members, actions] = await Promise.all([
    findUserIdByKindeID(session.kindeId),
    fetchPostsByBoardID(boardId),
    fetchMembersByBoardID(boardId),
    fetchTasks(boardId),
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
    <RTLProvider boardId={boardId}>
      <AnonymousModeProvider>
        <PostProvider initials={initialData} boardId={boardId}>
          <PostChannel boardId={boardId} userId={userID} />
          <div className="container mx-auto w-full max-w-full px-4">
            <div className="flex justify-end py-2">
              <MemberManageModalComponent
                boardId={boardId}
                viewOnly={!hasManagePermission}
              >
                <AvatarStack />
              </MemberManageModalComponent>
              <SortButton className="shrink-0 ml-1" />
              {!viewOnly && (
                <LinkButton
                  boardId={boardId}
                  viewOnly={!hasManagePermission}
                  className="shrink-0 ml-1"
                />
              )}
            </div>
            <BoardGrid boardId={boardId} viewOnly={viewOnly} userId={userID} />
          </div>
        </PostProvider>
      </AnonymousModeProvider>
    </RTLProvider>
  );
}
