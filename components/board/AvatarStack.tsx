"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { memberSignal } from "@/lib/signal/memberSingals";
import { computed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import MD5 from "crypto-js/md5";
import { memo } from "react";

interface AvatarIconProps {
  email: string;
  username: string;
}

export const AvatarIconWithFallback = memo(function AvatarIconWithFallback({
  email,
  username,
}: Readonly<AvatarIconProps>) {
  return (
    <Avatar className="border-2 border-background">
      <AvatarImage
        src={`https://www.gravatar.com/avatar/${MD5(email)}?d=mp&s=48`}
        alt={username}
      />
      <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
});

export function AvatarStack() {
  useSignals();
  const memberCount = computed(() => memberSignal.value.length);

  return (
    <div className="flex -space-x-3 hover:-space-x-1 transition-all duration-200 cursor-pointer">
      {memberSignal.value.slice(0, 5).map((member) => (
        <AvatarIconWithFallback
          key={member.id}
          email={member.email}
          username={member.username}
        />
      ))}
      {memberCount.value > 5 && (
        <Avatar className="border-2 border-background">
          <AvatarFallback>+{memberCount.value - 5}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
