import type { NewPost, Post } from '@/lib/types/post';

async function request(name: string, body: unknown) {
  const response = await fetch(`/mock/${name}`, { method: 'POST', body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Mock ${name} failed`);
}
export async function UpdatePostContentAction(id: string, _boardId: string, content: string) {
  const response = await fetch('/mock/save', { method: 'POST', body: content });
  if (!response.ok) throw new Error('Mock save failed');
  localStorage.setItem(id, content);
}
export const CreatePostAction = (post: NewPost) => request('create', post);
export const DeletePostAction = (id: string) => request('delete', id);
export const UpdatePostTypeAction = (id: string, _boardId: string, type: Post['type']) => request('type', { id, type });
export const MergePostsAction = async () => { throw new Error('Merge persistence is outside this fixture'); };
export const authedPostActionStateUpdate = (action: unknown) => request('status', action);
export const authedPostAssign = (action: unknown) => request('assign', action);
export const UpVotePostAction = (id: string) => request('vote', id);
export const DownVotePostAction = (id: string) => request('vote', id);

export const authedCreateAction = (action: unknown) => request("create-task", action);
