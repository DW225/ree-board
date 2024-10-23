"use client";

import NavButton from "@/components/navbar/NavButton";
import NavLink from "@/components/navbar/NavLink";
import { useToggle } from "@/hooks/useToggles";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { LogOut, X, Menu } from "lucide-react";
import dynamic from "next/dynamic";

const MobileMenu = dynamic(() => import("@/components/navbar/MobileMenu"), {
  ssr: false,
});

export default function Navbar() {
  const [isOpen, toggleMenu] = useToggle(false);

  return (
    <nav className="bg-white shadow-md" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <NavLink href="/">
              <span className="text-xl font-bold text-gray-800">Ree-Board</span>
            </NavLink>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <NavLink href="/board">Board</NavLink>
            <NavLink href="/profile">Profile</NavLink>
            <NavButton ariaLabel="Logout" className="ml-4">
              <LogoutLink>
                <LogOut className="h-5 w-5 inline-block" />
                <span className="sr-only">Logout</span>
              </LogoutLink>
            </NavButton>
          </div>
          <div className="flex items-center sm:hidden">
            <NavButton
              onClick={toggleMenu}
              ariaLabel={isOpen ? "Close main menu" : "Open main menu"}
              className="p-2"
            >
              <span className="sr-only">
                {isOpen ? "Close main menu" : "Open main menu"}
              </span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </NavButton>
          </div>
        </div>
      </div>
      {isOpen && <MobileMenu isOpen={isOpen} onClose={toggleMenu} />}
    </nav>
  );
}
