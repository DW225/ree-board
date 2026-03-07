"use client";

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
}: Readonly<NavLinkProps>) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 py-2 text-sm font-medium transition-colors",
        "text-slate-500 hover:text-slate-900",
        isActive && "text-indigo-600",
        "rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className,
      )}
      onClick={onClick}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
      )}
    </Link>
  );
}
