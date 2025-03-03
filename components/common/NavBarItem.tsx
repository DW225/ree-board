import type { FC, ReactNode } from "react";

interface NavBarItemProps {
  children: ReactNode;
  className?: string;
  tabIndex?: number;
  testId?: string;
}

const NavBarItem: FC<NavBarItemProps> = ({
  children,
  className,
  tabIndex,
  testId,
}) => {
  const defaultClasses = "btn btn-ghost";
  const btnClasses = className
    ? `${className} ${defaultClasses}`
    : defaultClasses;

  return (
    <span className="inline-flex items-center">
      <span className={btnClasses} tabIndex={tabIndex} data-testid={testId}>
        {children}
      </span>
    </span>
  );
};

export default NavBarItem;
