"use client";

import { nanoid } from "nanoid";
import React, { useState } from "react";

import { useAddPostForm } from "@/components/board/PostProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Post, PostType } from "@/db/schema";
import { authenticatedCreatePost } from "@/lib/actions/authenticatedActions";
import { addPost, removePost } from "@/lib/signal/postSignals";
import { toast } from "@/lib/signal/toastSignals";
import { Plus, X } from "lucide-react";

interface AddPostFormProps {
  userId: string;
  postType: PostType;
  boardID: string;
}

export default function AddPostForm({
  userId,
  postType,
  boardID,
}: Readonly<AddPostFormProps>) {
  const { openFormId, setOpenFormId } = useAddPostForm();
  const [content, setContent] = useState("");
  const [tempContent, setTempContent] = useState("");

  const formId = `${boardID}-${postType}`;
  const isAdding = openFormId === formId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const postId = nanoid();
    try {
      const newPost: Post = {
        id: postId,
        content,
        type: postType,
        author: userId,
        boardId: boardID,
        createdAt: new Date(),
        updatedAt: new Date(),
        voteCount: 0,
      };

      addPost(newPost);
      setTempContent(content);
      setContent("");

      await authenticatedCreatePost(newPost);
    } catch (error) {
      toast.error("Failed to create a post. Please try again later.");
      console.error("Failed to create a post:", error);
      removePost(postId);
      setContent(tempContent);
      setTempContent("");
    }
  };

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isAdding ? "animate-fade-in-down" : "animate-fade-out-up"
      }`}
    >
      {!isAdding ? (
        <button
          onClick={() => setOpenFormId(formId)}
          className="flex items-center justify-center w-full p-2 my-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors duration-200 ease-in-out"
        >
          <Plus className="h-5 w-5 mr-2" />
          <span>Add a post</span>
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-2 p-2 transition-all duration-200 ease-in-out"
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter a title for this card..."
            className="w-full p-2 border border-gray-300 rounded-sm focus:border-blue-400 bg-slate-50"
            rows={3}
          />
          <div className="mt-2 flex items-center">
            <Button
              type="submit"
              className="px-3 py-1.5 rounded-sm bg-blue-600 text-white"
              variant="outline"
              aria-labelledby="add post button"
            >
              Add Card
            </Button>
            <Button
              onClick={() => setOpenFormId("")}
              className="ml-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 ease-in-out"
              size="icon"
              variant="ghost"
              aria-labelledby="close form button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
