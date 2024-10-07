import NavLink from "./NavLink";
import NavButton from "./NavButton";
import { LogOut } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MobileMenu({ onClose }: Readonly<MobileMenuProps>) {
  return (
    <div className="sm:hidden" id="mobile-menu">
      <div className="pt-2 pb-3 space-y-1">
        <NavLink href="/board" onClick={onClose} className="block w-full text-left">
          Board
        </NavLink>
        <NavLink href="/profile" onClick={onClose} className="block w-full text-left">
          Profile
        </NavLink>
        <NavButton
          onClick={() => {
            onClose();
          }}
          ariaLabel="Logout"
          className="block w-full text-left"
        >
          <LogoutLink className="flex items-center">
            <LogOut className="h-5 w-5 mr-2" /> Logout
          </LogoutLink>
        </NavButton>
      </div>
    </div>
  );
}
