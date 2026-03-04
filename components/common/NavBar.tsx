"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToggle } from "@/hooks/useToggles";
import { Menu } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/ui/logout";
import NavLink from "../navbar/NavLink";

export default function Navbar() {
  const [isOpen, toggleMenu] = useToggle(false);

  return (
    <>
      <nav
        className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        aria-label="Main navigation"
      >
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link
                href="/"
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <span className="text-xl font-bold text-foreground">
                  Ree-Board
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-1 lg:flex">
              <NavLink href="/board">Board</NavLink>
              <NavLink href="/profile">Profile</NavLink>

              {/* Desktop Logout Button */}
              <div className="ml-2">
                <LogoutButton />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center lg:hidden">
              <Sheet open={isOpen} onOpenChange={toggleMenu}>
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
                      <LogoutButton
                        onClick={toggleMenu}
                        className="w-full justify-start"
                      />
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
