import LinkButton from "@/components/board/MagicLink/LinkButton";
import { Role } from "@/lib/constants/role";
import { fetchMembersByBoardID } from "@/lib/db/member";
import { fetchPostsByBoardID } from "@/lib/db/post";
import { fetchTasks } from "@/lib/db/task";
import { findUserIdByKindeID } from "@/lib/db/user";
import { fetchUserVotedPost } from "@/lib/db/vote";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

// Critical path components - load immediately
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

type BoardPageParams = Promise<{ id: string }>;

export default async function BoardPage({
  params,
}: {
  params: Readonly<BoardPageParams>;
}) {
  const { id } = await params;

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    redirect("/api/auth/login");
  }

  const [userID, posts, members, actions] = await Promise.all([
    findUserIdByKindeID(user.id),
    fetchPostsByBoardID(id),
    fetchMembersByBoardID(id),
    fetchTasks(id),
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
    <RTLProvider boardId={id}>
      <AnonymousModeProvider>
        <PostProvider initials={initialData} boardId={id}>
          <PostChannel boardId={id} userId={userID} />
          <div className="container mx-auto w-full max-w-full px-4">
            <div className="flex justify-end py-2">
              <MemberManageModalComponent
                boardId={id}
                viewOnly={!hasManagePermission}
              >
                <AvatarStack />
              </MemberManageModalComponent>
              <SortButton className="shrink-0 ml-1" />
              {!viewOnly && (
                <LinkButton
                  boardId={id}
                  viewOnly={!hasManagePermission}
                  className="shrink-0 ml-1"
                />
              )}
            </div>
            <BoardGrid boardId={id} viewOnly={viewOnly} userId={userID} />
          </div>
        </PostProvider>
      </AnonymousModeProvider>
    </RTLProvider>
  );
}
