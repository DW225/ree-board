"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Link } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

const MagicLinkCreator = dynamic(
  () => import("@/components/board/MagicLink/MagicLinkCreator"),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="h-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    ),
  }
);

const MagicLinkManager = dynamic(
  () => import("@/components/board/MagicLink/MagicLinkManager"),
  {
    loading: () => (
      <div className="space-y-2">
        <div className="h-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-16 bg-gray-200 rounded animate-pulse" />
      </div>
    ),
  }
);

interface LinkButtonProps {
  boardId: string;
  viewOnly: boolean;
  className?: string;
}

/**
 * A button that opens a modal for managing magic invite links.
 * Allows owners to create and revoke magic links, while members can only view them.
 *
 * @param boardId - The ID of the board for which to manage links
 * @param viewOnly - Whether the user has view-only permissions (hides create/revoke actions)
 * @param className - Optional CSS class names for the button
 */
export default function LinkButton({
  boardId,
  viewOnly,
  className,
}: Readonly<LinkButtonProps>) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("gap-1", className)}>
          <Link className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Link</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {!viewOnly && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Create Magic Link</h4>
                <MagicLinkCreator boardId={boardId} />
              </div>
            </div>
          )}

          <div className="mt-6">
            <MagicLinkManager viewOnly={viewOnly} boardId={boardId} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
