import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function NavLink({
  href,
  children,
  onClick,
  className,
}: Readonly<NavLinkProps>) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        `relative px-3 py-2 text-sm font-medium transition-colors hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md ${
          isActive ? "text-gray-900" : "text-gray-600"
        } ${className ?? ""}`
      )}
      onClick={onClick}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
      )}
    </Link>
  );
}
