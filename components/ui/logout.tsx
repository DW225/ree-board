"use client";

import NavButton from "@/components/navbar/NavButton";
import { createClient } from "@/lib/utils/supabase/client";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: Readonly<LogoutButtonProps>) {
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
      router.push("/");
    });
  };

  return (
    <NavButton
      onClick={logout}
      disabled={isPending}
      ariaLabel={isPending ? "Signing out..." : "Logout"}
      className={className}
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 inline-block animate-spin" />
      ) : (
        <LogOut className="h-5 w-5 inline-block" />
      )}
      <span className="sr-only">{isPending ? "Signing out..." : "Logout"}</span>
    </NavButton>
  );
}
