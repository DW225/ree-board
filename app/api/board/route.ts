import { fetchBoards } from "@/lib/db/board";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const GET = async function board(req: NextRequest) {
  const res = new NextResponse();
  try {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const isUserAuthenticated = await isAuthenticated();
    if (!isUserAuthenticated) {
      return NextResponse.json({ error: "Not authenticated", status: 401 });
    }
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "User not found", status: 404 });
    }

    const boards = await fetchBoards(user.id, true);
    return NextResponse.json(boards);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message, status: 500 }, res);
    } else {
      return NextResponse.json(
        { error: "An unexpected error occurred", status: 500 },
        res
      );
    }
  }
};
