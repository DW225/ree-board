import NavLink from "./NavLink";
import NavButton from "./NavButton";
import { LogOut, X } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { useEffect } from "react";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MobileMenu({
  isOpen,
  onClose,
}: Readonly<MobileMenuProps>) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity lg:hidden z-40 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        id="mobile-menu"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <NavButton
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            ariaLabel="Close menu"
          >
            <X className="h-6 w-6" />
          </NavButton>
        </div>

        <nav className="px-4 py-6 space-y-1">
          <div className="flex flex-col space-y-1">
            <NavLink href="/board" onClick={onClose}>
              Board
            </NavLink>
            <NavLink href="/profile" onClick={onClose}>
              Profile
            </NavLink>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-200">
            <NavButton
              onClick={() => {
                onClose();
              }}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              ariaLabel="Logout"
            >
              <LogoutLink>
                <LogOut className="h-5 w-5 inline-block" />
                <span className="sr-only">Logout</span>
              </LogoutLink>
            </NavButton>
          </div>
        </nav>
      </div>
    </>
  );
}
