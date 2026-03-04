"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/utils/supabase/client";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

interface LogoutButtonProps {
  className?: string;
  onClick?: () => void;
}

export function LogoutButton({ className, onClick }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const logout = () => {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        toast.error("Error signing out. Please try again.");
        return;
      }
      onClick?.();
      router.push("/");
    });
  };

  return (
    <Button
      onClick={logout}
      disabled={isPending}
      variant="ghost"
      className={className}
      aria-label={isPending ? "Signing out..." : "Logout"}
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <LogOut className="h-5 w-5" />
      )}
      <span className="ml-2">{isPending ? "Signing out..." : "Logout"}</span>
    </Button>
  );
}
