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
    const { user, isLoading } = useUser(userID);
    console.log("User:", userID);

    if (isLoading) {
      return <Skeleton className={cn("h-8 w-8 rounded-full", className)} />;
    }

    const avatarContent = (
      <Avatar className={cn("h-8 w-8", className)} ref={ref}>
        <AvatarImage
          src={`https://www.gravatar.com/avatar/${MD5(
            user?.email ?? ""
          )}?d=404&s=48`}
          alt={user?.name ?? "Unknown User"}
        />
        <AvatarFallback>
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
