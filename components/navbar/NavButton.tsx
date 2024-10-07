import { Button } from "@/components/ui/button";

type NavButtonProps = {
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
};

export default function NavButton({
  onClick,
  children,
  ariaLabel,
  className = "",
}: Readonly<NavButtonProps>) {
  return (
    <Button
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        className ?? ""
      }`}
      aria-label={ariaLabel}
      variant="ghost"
    >
      {children}
    </Button>
  );
}
