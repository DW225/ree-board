"use client";

import { AvatarIcon } from "@/components/common/AvatarIcon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { memberSignal } from "@/lib/signal/memberSignals";
import { useComputed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";

export function AvatarStack() {
  useSignals();
  const memberCount = useComputed(() => memberSignal.value.length);
  const visibleMembers = useComputed(() => memberSignal.value.slice(0, 5));

  return (
    <div className="flex items-center -space-x-2">
      {visibleMembers.value.map((member) => (
        <AvatarIcon
          key={member.id}
          userID={member.userId}
          className="ring-2 ring-white"
        />
      ))}
      {memberCount.value > 5 && (
        <Avatar className="size-9 ring-2 ring-white">
          <AvatarFallback>+{memberCount.value - 5}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
