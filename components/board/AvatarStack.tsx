"use client";

import { AvatarIconWithFallback } from "@/components/common/AvatarWithFallback";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { memberSignal } from "@/lib/signal/memberSingals";
import { useComputed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";

export function AvatarStack() {
  useSignals();
  const memberCount = useComputed(() => memberSignal.value.length);

  return (
    <div className="flex -space-x-3 hover:-space-x-1 transition-all duration-200 cursor-pointer">
      {useComputed(() => memberSignal.value.slice(0, 5)).value.map((member) => (
        <AvatarIconWithFallback
          key={member.id}
          userID={member.userId}
        />
      ))}
      {memberCount.value > 5 && (
        <Avatar>
          <AvatarFallback>+{memberCount.value - 5}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
