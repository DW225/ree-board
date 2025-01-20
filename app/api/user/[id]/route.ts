import { getUserByUserID } from "@/lib/db/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

export const revalidate = 3600;

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    redirect("/");
  }
  const userID = params.id;

  const user = await getUserByUserID(userID);
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
