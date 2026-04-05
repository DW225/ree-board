"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { createClient } from "@/lib/utils/supabase/client";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import NavLink from "../navbar/NavLink";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen((v) => !v);
  const { user } = useSupabaseSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const getInitials = () => {
    const name = user?.user_metadata?.full_name as string | undefined;
    if (name) {
      return name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() ?? "?";
  };

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Error signing out. Please try again.");
        return;
      }
      router.push("/");
    });
  };

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/favicon.svg"
              width={28}
              height={28}
              alt="ReeBoard logo"
            />
            <span className="text-lg font-bold text-slate-900">ReeBoard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            <NavLink href="/board">Board</NavLink>
            <NavLink href="/profile">Profile</NavLink>

            {/* User Avatar Dropdown */}
            <div className="ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-slate-200 bg-slate-50 px-2.5 py-1.5 hover:bg-slate-100 hover:text-inherit"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[linear-gradient(135deg,#6366F1,#8B5CF6)] text-white text-xs font-semibold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-slate-900">
                        {(user?.user_metadata?.full_name as string) ?? ""}
                      </p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isPending}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isPending ? "Logging out..." : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMenu}
                aria-label="Open menu"
                className="h-10 w-10"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <SheetContent side="right" className="w-full sm:w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <nav className="mt-6 flex flex-col space-y-4">
                  <NavLink href="/board" onClick={toggleMenu}>
                    Board
                  </NavLink>
                  <NavLink href="/profile" onClick={toggleMenu}>
                    Profile
                  </NavLink>

                  <div className="border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        toggleMenu();
                        handleLogout();
                      }}
                      disabled={isPending}
                      className="w-full justify-start gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut className="h-4 w-4" />
                      {isPending ? "Logging out..." : "Log out"}
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
