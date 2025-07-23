"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Edit, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { RouterOutputs } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";

// Fixed Dialog imports - using project's custom UI components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Post = RouterOutputs["post"]["getAll"][number];

interface PostCardProps {
  post: Post;
  onMovePost: (postId: string, newColumnId: string) => void;
  columns: Array<{ id: string; name: string; color: string }>;
  canEdit?: boolean;
}

export function PostCard({ post, onMovePost, columns, canEdit = true }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(post.title);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedColumnId, setEditedColumnId] = useState(post.columnId);
  const [isDeleting, setIsDeleting] = useState(false);

  const { userId } = useAuth();
  const utils = api.useUtils();

  const updatePost = api.post.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      toast.success("Post updated successfully");
      void utils.post.getAll.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update post: " + error.message);
    },
  });

  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      setIsDeleting(false);
      toast.success("Post deleted successfully");
      void utils.post.getAll.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete post: " + error.message);
    },
  });

  const handleSave = () => {
    if (!editedTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    updatePost.mutate({
      id: post.id,
      title: editedTitle,
      content: editedContent,
      columnId: editedColumnId,
    });
  };

  const handleDelete = () => {
    deletePost.mutate({ id: post.id });
  };

  const handleMoveLeft = () => {
    const currentIndex = columns.findIndex((col) => col.id === post.columnId);
    if (currentIndex > 0) {
      const newColumnId = columns[currentIndex - 1]?.id;
      if (newColumnId) {
        onMovePost(post.id, newColumnId);
      }
    }
  };

  const handleMoveRight = () => {
    const currentIndex = columns.findIndex((col) => col.id === post.columnId);
    if (currentIndex < columns.length - 1) {
      const newColumnId = columns[currentIndex + 1]?.id;
      if (newColumnId) {
        onMovePost(post.id, newColumnId);
      }
    }
  };

  const currentColumn = columns.find((col) => col.id === post.columnId);
  const currentColumnIndex = columns.findIndex((col) => col.id === post.columnId);
  const canMoveLeft = currentColumnIndex > 0;
  const canMoveRight = currentColumnIndex < columns.length - 1;

  const isOwner = userId === post.createdBy;

  return (
    <Card className="w-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {post.title}
            </h3>
            {currentColumn && (
              <Badge
                variant="secondary"
                className="mt-2 text-xs"
                style={{ backgroundColor: currentColumn.color + "20", color: currentColumn.color }}
              >
                {currentColumn.name}
              </Badge>
            )}
          </div>
          {(canEdit && isOwner) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsDeleting(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      {post.content && (
        <CardContent className="pt-0 pb-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.content}
          </p>
        </CardContent>
      )}

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.createdByUser?.imageUrl ?? ""} />
            <AvatarFallback className="text-xs">
              {post.createdByUser?.firstName?.[0] ?? "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
          </span>
        </div>

        {canEdit && isOwner && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMoveLeft}
              disabled={!canMoveLeft}
              className="h-6 w-6 p-0"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMoveRight}
              disabled={!canMoveRight}
              className="h-6 w-6 p-0"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardFooter>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Enter post title"
              />
            </div>
            
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Enter post content"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="column">Column</Label>
              <Select value={editedColumnId} onValueChange={setEditedColumnId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        <span>{column.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updatePost.isPending}>
              {updatePost.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-semibold text-sm">{post.title}</h4>
            {post.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {post.content}
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
