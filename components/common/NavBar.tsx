"use client";

import NavButton from "@/components/navbar/NavButton";
import NavLink from "@/components/navbar/NavLink";
import { LogoutButton } from "@/components/ui/logout";
import { useToggle } from "@/hooks/useToggles";
import { Menu } from "lucide-react";
import dynamic from "next/dynamic";

const MobileMenu = dynamic(() => import("@/components/navbar/MobileMenu"), {
  ssr: false,
});

export default function Navbar() {
  const [isOpen, toggleMenu] = useToggle(false);

  return (
    <>
      <nav
        className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md"
        aria-label="Main navigation"
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <NavLink href="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-gray-900">
                  Ree-Board
                </span>
              </NavLink>
            </div>

            {/* Desktop Navigation - Right side */}
            <div className="hidden lg:flex lg:items-center lg:space-x-1">
              <NavLink href="/board">Board</NavLink>
              <NavLink href="/profile">Profile</NavLink>

              {/* Desktop Logout Button */}
              <LogoutButton className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-2 disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center lg:hidden">
              <NavButton
                onClick={toggleMenu}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                ariaLabel="Open menu"
                aria-expanded={isOpen}
              >
                <Menu className="h-5 w-5" />
              </NavButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isOpen} onClose={toggleMenu} />
    </>
  );
}
