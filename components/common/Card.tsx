"use client";

import type { ReactNode } from "react";
import React from "react";

interface CardProps {
  children: ReactNode;
  variant: "board" | "post";
  onClick?: () => void;
  className?: string;
  draggable?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant,
  onClick,
  className = "",
  draggable = false,
}) => {
  const baseClasses =
    "rounded-lg shadow-sm transition-all duration-200 overflow-hidden";

  const variantClasses = {
    board: "bg-white hover:shadow-md w-64 h-32 sm:w-56 sm:h-28 md:w-64 md:h-32",
    post: "bg-yellow-100 hover:bg-yellow-200 w-full min-h-[80px] my-2",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <div className={classes} onClick={onClick} draggable={draggable}>
      <div className="p-3 h-full flex flex-col">{children}</div>
    </div>
  );
};

export default Card;
