import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTrigger
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ReactNode } from "react";
import { forwardRef } from "react";

interface DialogItemProps {
  triggerChildren: ReactNode | string;
  children: ReactNode;
  className?: string;
  onOpenChange: (open: boolean) => void;
  onSelect?: () => void;
}

export const DialogItem = forwardRef<HTMLDivElement, DialogItemProps>(
  (
    {
      triggerChildren,
      children,
      className,
      onSelect,
      onOpenChange,
      ...itemProps
    },
    forwardedRef
  ) => {
    return (
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <DropdownMenuItem
            {...itemProps}
            ref={forwardedRef}
            className="DropdownMenuItem"
            onSelect={(event) => {
              event.preventDefault();
              if (onSelect) onSelect();
            }}
          >
            {triggerChildren}
          </DropdownMenuItem>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/80 animate-in fade-in-0 duration-150" />
          <DialogContent className={className}>
            {children}
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }
);

// Add display name for better debugging
DialogItem.displayName = "DialogItem";
