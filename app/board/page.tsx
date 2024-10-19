import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

import { NavBar } from "@/components/common";
import { BoardList, CreateBoardForm } from "@/components/home";
import { fetchBoards } from "@/lib/db/board";
import { HomeProvider } from "@/components/home/HomeProvider";
import { ToastSystem } from "@/components/common/ToastSystem";
import { findUserIdByKindeID } from "@/lib/db/user";

export default async function Boards() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {
    redirect("/api/auth/login");
  }

  const [initialBoardList, userID] = await Promise.all([
    fetchBoards(user.id),
    findUserIdByKindeID(user.id),
  ]);

  if (!userID) {
    throw new Error("User not found");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="container mx-auto mt-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Your Boards</h1>
        <div className="flex flex-wrap gap-4">
          <HomeProvider initialBoards={initialBoardList}>
            <CreateBoardForm userID={userID} />
            <BoardList userID={userID} />
          </HomeProvider>
        </div>
      </div>
      <ToastSystem />
    </div>
  );
}
