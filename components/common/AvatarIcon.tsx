import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/db/schema";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { MD5 } from "crypto-js";
import { forwardRef, type ReactNode } from "react";

interface AvatarIconProps {
  userID: User["id"];
  className?: string;
  triggers?: (user: User | undefined, children: ReactNode) => ReactNode;
}

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
          src={`https://www.gravatar.com/avatar/${MD5(
            user?.email ?? ""
          )}?d=404&s=36`}
          alt={user?.name ?? "Unknown User"}
          className="size-full rounded-[inherit] object-cover"
        />
        <AvatarFallback className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11">
          {user?.name ? user.name.charAt(0).toUpperCase() : "UU"}
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
