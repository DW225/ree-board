"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { memberSignal } from "@/lib/signal/memberSingals";
import { computed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import MD5 from "crypto-js/md5";

export default function AvatarStack() {
  useSignals();
  const memberCount = computed(() => memberSignal.value.length);

  return (
    <div className="flex -space-x-3 hover:-space-x-1 transition-all duration-200 cursor-pointer">
      {memberSignal.value.slice(0, 5).map((member) => (
        <Avatar key={member.id} className="border-2 border-background">
          <AvatarImage
            src={`https://www.gravatar.com/avatar/${MD5(
              member.email
            )}?d=mp&s=48`}
            alt={member.username}
          />
          <AvatarFallback>
            {member.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {memberCount.value > 5 && (
        <Avatar className="border-2 border-background">
          <AvatarFallback>+{memberCount.value - 5}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
