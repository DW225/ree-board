import type { Post } from "@/lib/types/post";
import type { Board, NewBoard } from "@/lib/types/board";

export const createBoardAction = async (board: NewBoard) => {
  await request("create-board", board);
  return board.id;
};

export const updateBoardAction = async (
  boardId: string,
  details: Pick<Board, "title" | "description" | "visibility">
) => {
  const response = await fetch("/mock/board-settings", {
    method: "POST",
    body: JSON.stringify({ boardId, ...details }),
  });
  if (!response.ok) throw new Error("Mock board update failed");
  return response.json();
};
export const deleteBoardAction = () =>
  Promise.reject(new Error("Board deletion is outside this fixture"));

async function request(name: string, body: unknown) {
  const response = await fetch(`/mock/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Mock ${name} failed`);
}
export async function UpdatePostContentAction(
  id: string,
  _boardId: string,
  content: string
) {
  const response = await fetch("/mock/save", { method: "POST", body: content });
  if (!response.ok) throw new Error("Mock save failed");
  localStorage.setItem(id, content);
}
export const CreatePostAction = async (post: Post) => {
  await request("create", post);
  return {
    ...post,
    content: post.content.trim(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
export const DeletePostAction = (id: string) => request("delete", id);
export const UpdatePostTypeAction = (
  id: string,
  _boardId: string,
  type: Post["type"]
) => request("type", { id, type });
export const MergePostsAction = () =>
  Promise.reject(new Error("Merge persistence is outside this fixture"));
export const authedPostActionStateUpdate = (action: unknown) =>
  request("status", action);
export const authedPostAssign = (action: unknown) => request("assign", action);
export const UpVotePostAction = (id: string) => request("vote", id);
export const DownVotePostAction = (id: string) => request("vote", id);

export const authedCreateAction = (action: unknown) =>
  request("create-task", action);

export const upgradeGuestAccount = () =>
  Promise.resolve({ success: true, needsOtp: true });
export const verifyGuestUpgradeOTP = () =>
  Promise.resolve({ success: false, error: "Mock verification only" });
export const getBoardsWhereUserIsAdminAction = async () =>
  (await fetch("/mock/boards")).json();
export const getMembersFromBoardWithExclusionAction = async (boardId: string) =>
  (await fetch("/mock/members", { method: "POST", body: boardId })).json();
export const bulkImportMembersAction = async (
  boardId: string,
  sourceBoardId: string,
  userIds: string[]
) => {
  const response = await fetch("/mock/import", {
    method: "POST",
    body: JSON.stringify({ boardId, sourceBoardId, userIds }),
  });
  if (!response.ok) throw new Error("Mock import failed");
  return response.json();
};

export const updateMemberRoleAction = async (
  boardId: string,
  userId: string,
  role: number
) => {
  const response = await fetch("/mock/member-role", {
    method: "POST",
    body: JSON.stringify({ boardId, userId, role }),
  });
  if (!response.ok) throw new Error("Mock role update failed");
  return response.json();
};
export const findUserByEmailAction = () =>
  Promise.reject(new Error("Invite is outside this fixture"));
export const addMemberToBoardAction = () =>
  Promise.reject(new Error("Invite is outside this fixture"));
export const removeMemberFromBoardAction = () =>
  Promise.reject(new Error("Removal is outside this fixture"));
