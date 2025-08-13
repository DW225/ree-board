import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

interface CustomLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  ariaLabel?: string;
}

export default function CustomLink({
  href,
  children,
  ariaLabel,
  ...props
}: Readonly<CustomLinkProps>) {
  // Safely extract text content from children for aria-label fallback
  const getTextContent = (node: ReactNode): string => {
    if (typeof node === "string" || typeof node === "number") {
      return String(node);
    }
    return "Link";
  };

  const defaultAriaLabel = `${getTextContent(children)} (opens in new tab)`;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500"
      aria-label={ariaLabel || defaultAriaLabel}
      {...props}
    >
      {children}
    </Link>
  );
}
