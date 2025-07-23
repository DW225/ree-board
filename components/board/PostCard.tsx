import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MessageSquare, User, UserCheck } from "lucide-react";
import { useState } from "react";

interface PostCardProps {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  author: {
    name: string;
    avatar?: string;
  };
  commentsCount: number;
  assignee?: {
    name: string;
    avatar?: string;
  };
}

export function PostCard({
  id,
  title,
  content,
  tags,
  createdAt,
  author,
  commentsCount,
  assignee,
}: PostCardProps) {
  const [assigneeInput, setAssigneeInput] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const handleAssignTask = () => {
    // Handle task assignment logic here
    console.log("Assigning task:", { assigneeInput, taskDescription });
    setAssigneeInput("");
    setTaskDescription("");
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserCheck className="h-4 w-4 mr-1" />
                Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Assign Task</DialogTitle>
                <DialogDescription>
                  Assign this post as a task to a team member.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assignee" className="text-right">
                    Assignee
                  </Label>
                  <Input
                    id="assignee"
                    value={assigneeInput}
                    onChange={(e) => setAssigneeInput(e.target.value)}
                    placeholder="Enter username or email"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Task description (optional)"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAssignTask}>Assign Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-gray-600 mb-3 line-clamp-3">{content}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={author.avatar} />
              <AvatarFallback>
                {author.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <span>{author.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{createdAt}</span>
          </div>
          {assignee && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Assigned to {assignee.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span>{commentsCount}</span>
        </div>
      </div>
    </div>
  );
}
