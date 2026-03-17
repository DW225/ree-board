"use client";

import { useAddPostForm } from "@/components/board/PostProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CreatePostAction } from "@/lib/actions/post/action";
import { authedCreateAction } from "@/lib/actions/task/action";
import { PostType } from "@/lib/constants/post";
import { addPost, addPostTask, removePost } from "@/lib/signal/postSignals";
import type { Post } from "@/lib/types/post";
import type { NewTask } from "@/lib/types/task";
import { Plus, X } from "lucide-react";
import { nanoid } from "nanoid";
import type { SubmitEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const PLACEHOLDER_BY_TYPE: Record<PostType, string> = {
  [PostType.went_well]: "What went well this sprint?",
  [PostType.to_improvement]: "What needs improvement?",
  [PostType.to_discuss]: "What would you like to discuss?",
  [PostType.action_item]: "Describe the action item...",
} as const satisfies Record<PostType, string>;

interface AddPostFormProps {
  userId: string;
  postType: PostType;
  boardId: string;
}

export default function AddPostForm({
  userId,
  postType,
  boardId,
}: Readonly<AddPostFormProps>) {
  const { openFormId, setOpenFormId } = useAddPostForm();
  const [content, setContent] = useState("");
  const [tempContent, setTempContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const formId = `${boardId}-${postType}`;
  const isAdding = openFormId === formId;

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      const postId = nanoid();
      try {
        const newPost: Post = {
          id: postId,
          content,
          type: postType,
          author: userId,
          boardId: boardId,
          createdAt: new Date(),
          updatedAt: new Date(),
          voteCount: 0,
        };

        addPost(newPost);
        setTempContent(content);
        setContent("");

        await CreatePostAction(newPost);
        if (postType === PostType.action_item) {
          const newTask: NewTask = {
            id: nanoid(),
            postId,
            boardId,
          };
          try {
            await authedCreateAction(newTask);
            addPostTask(newTask);
          } catch (error) {
            removePost(postId);
            throw error; // Re-throw to trigger the outer catch block
          }
        }
      } catch (error) {
        toast.error("Failed to create a post. Please try again later.");
        console.error("Failed to create a post");
        if (process.env.NODE_ENV !== "production") {
          console.error(error);
        }
        removePost(postId);
        setContent(tempContent);
        setTempContent("");
      }
    });
  };

  return (
    <div className="transition-all duration-200 ease-in-out">
      {!isAdding ? (
        <button
          onClick={() => setOpenFormId(formId)}
          className="flex items-center gap-1.5 w-full px-3 py-2 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-[#94A3B8] hover:text-[#64748B] hover:border-[#94A3B8] transition-colors duration-150 ease-in-out"
        >
          <Plus className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-sm">Add a card</span>
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-lg bg-white border border-[#6366F1]/20 p-3 shadow-sm"
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER_BY_TYPE[postType]}
            disabled={isPending}
            className="w-full resize-none border border-[#E2E8F0] rounded-md bg-[#F8FAFC] text-sm text-[#374151] placeholder:text-[#94A3B8] focus-visible:ring-1 focus-visible:ring-[#6366F1]"
            rows={3}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className="h-8 px-3 text-sm bg-[#6366F1] text-white hover:bg-[#4f46e5] rounded-md disabled:opacity-60"
              aria-label="Add card"
            >
              {isPending ? "Adding…" : "Add Card"}
            </Button>
            <Button
              type="button"
              onClick={() => setOpenFormId("")}
              size="icon"
              variant="ghost"
              disabled={isPending}
              className="h-8 w-8 text-[#94A3B8] hover:text-[#64748B]"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
