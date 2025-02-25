import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/db/schema";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { MD5 } from "crypto-js";
import { memo } from "react";

interface AvatarIconProps {
  userID: User["id"];
  className?: string;
}

export const AvatarIcon = memo(function AvatarIcon({
  userID,
  className,
}: Readonly<AvatarIconProps>) {
  const { user, isError, isLoading } = useUser(userID);

  if (isError) {
    return (
      <Avatar className={cn("h-8 w-8", className)}>
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  }
  if (isLoading) {
    return (
      <Avatar className={cn("h-8 w-8", className)}>
        <Skeleton></Skeleton>
      </Avatar>
    );
  }

  if (!user) {
    return (
      <Avatar className={cn("h-8 w-8", className)}>
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  }
  const { email, name } = user;
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage
        src={`https://www.gravatar.com/avatar/${MD5(email)}&s=48`}
        alt={name}
      />
      <AvatarFallback>{name}</AvatarFallback>
    </Avatar>
  );
});

AvatarIcon.displayName = "AvatarIcon";
