import { cn } from "@/lib/utils";
import Link from "next/link";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function NavLink({
  href,
  children,
  onClick,
  className,
}: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        `px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          className ?? ""
        }`
      )}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
