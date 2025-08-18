"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import type { User } from "@/lib/types/user";
import { cn } from "@/lib/utils";
import { md5 } from "@/lib/utils/md5";
import type { ReactNode } from "react";
import { forwardRef } from "react";

interface AvatarIconProps {
  userID: User["id"];
  className?: string;
  triggers?: (user: User | undefined, children: ReactNode) => ReactNode;
}

// Helper function to generate initials from a name
const getInitials = (name: string | undefined): string => {
  if (!name) return "UU";

  // Split the name by spaces
  const nameParts = name.split(/[ _]+/);

  if (nameParts.length === 1) {
    return nameParts[0].length > 1
      ? nameParts[0].substring(0, 2).toUpperCase()
      : nameParts[0].charAt(0).toUpperCase().repeat(2);
  } else {
    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  }
};

export const AvatarIcon = forwardRef<HTMLDivElement, AvatarIconProps>(
  ({ userID, className = "", triggers }, ref) => {
    const { user, isLoading, isError } = useUser(userID);

    if (isError) {
      return (
        <Avatar
          className={cn(
            "inline-flex size-[36px] select-none items-center justify-center overflow-hidden rounded-full bg-blackA1 align-middle",
            className
          )}
          ref={ref}
        >
          <AvatarFallback className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11">
            Error
          </AvatarFallback>
        </Avatar>
      );
    }

    if (isLoading) {
      return (
        <Avatar
          className={cn(
            "inline-flex size-[36px] select-none items-center justify-center overflow-hidden rounded-full bg-blackA1 align-middle",
            className
          )}
          ref={ref}
        >
          <Skeleton className="size-full rounded-[inherit] object-cover" />
        </Avatar>
      );
    }

    const avatarContent = (
      <Avatar
        className={cn(
          "inline-flex size-[36px] select-none items-center justify-center overflow-hidden rounded-full bg-blackA1 align-middle",
          className
        )}
        ref={ref}
      >
        <AvatarImage
          src={`https://www.gravatar.com/avatar/${md5(
            user?.email ?? ""
          )}?d=404&s=36`}
          alt={user?.name ?? "Unknown User"}
          className="size-full rounded-[inherit] object-cover"
        />
        <AvatarFallback className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11">
          {getInitials(user?.name)}
        </AvatarFallback>
      </Avatar>
    );

    if (triggers && user) {
      return triggers(user, avatarContent);
    }

    return avatarContent;
  }
);

AvatarIcon.displayName = "AvatarIcon";
