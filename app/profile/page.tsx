import NavBar from "@/components/common/NavBar";
import { ChangePasswordSection } from "@/components/profile/ChangePasswordSection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { md5 } from "@/lib/utils/md5";
import type { Metadata } from "next";
import Image from "next/image";
import { User } from "lucide-react";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and manage your profile settings",
};

export default async function ProfilePage() {
  // Verify session and get user using centralized DAL
  const user = await getCurrentUser();

  // Determine display name with explicit logic instead of nested ternaries
  let displayName = "User";
  if (user?.user_metadata?.display_name) {
    displayName = user.user_metadata.display_name;
  } else if (user?.email) {
    displayName = user.email.split("@")[0];
  }

  const avatarEmail = (user?.email ?? "").trim().toLowerCase();

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>

        <div className="space-y-6">
          {/* Profile Information Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-slate-600" />
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Image
                  src={`https://www.gravatar.com/avatar/${md5(
                    avatarEmail
                  )}?d=mp&s=80`}
                  alt="Profile"
                  className="w-20 h-20 rounded-full"
                  width={80}
                  height={80}
                />
                <div>
                  <p className="font-semibold text-lg">{displayName}</p>
                  <p className="text-slate-600">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
          <ChangePasswordSection />
        </div>
      </div>
    </div>
  );
}
