import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function NavLink({
  href,
  children,
  onClick,
  className,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 py-2 text-sm font-medium transition-colors",
        "text-muted-foreground hover:text-foreground",
        isActive && "text-foreground",
        "rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className,
      )}
      onClick={onClick}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
      )}
    </Link>
  );
}
