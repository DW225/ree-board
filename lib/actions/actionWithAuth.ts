import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

export async function actionWithAuth<T>(
  action: () => Promise<T>
): Promise<T | null> {
  const { isAuthenticated } = getKindeServerSession();

  if (!isAuthenticated()) {
    console.warn("Not authenticated");
    redirect("/");
  }

  return await action();
}
