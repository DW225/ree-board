import Link from "next/link";

interface CustomLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function CustomLink({ href, children }: CustomLinkProps) {
  return (
    <Link href={href} passHref legacyBehavior>
      <a
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500"
        aria-label={`${children} (opens in new tab)`}
      >
        {children}
      </a>
    </Link>
  );
}
