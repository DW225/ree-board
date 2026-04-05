"use client";

import type { Board } from "@/lib/types/board";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useBoardCardActions(boardId: Board["id"]) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleClick = () => {
    if (!isDropdownOpen) {
      router.push(`/board/${boardId}`);
    }
  };

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleClick,
  };
}
