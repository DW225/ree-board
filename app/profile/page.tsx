import NavBar from "@/components/common/NavBar";
import { getCurrentUser } from "@/lib/dal";
import { md5 } from "@/lib/utils/md5";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and manage your profile settings",
};

export default async function ProfilePage() {
  // Verify session and get user using centralized DAL
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto p-4 flex">
        <div className="flex-1">
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <div className="flex items-center mb-4">
                <Image
                  src={`https://www.gravatar.com/avatar/${md5(
                    (user?.email ?? "").trim().toLowerCase()
                  )}?d=mp&s=64`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full mr-4"
                  width={64}
                  height={64}
                />
                <div>
                  <p className="font-bold">
                    {user?.user_metadata?.display_name ??
                      user?.email?.split("@")[0] ??
                      "User"}
                  </p>
                  <p className="text-gray-600">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
