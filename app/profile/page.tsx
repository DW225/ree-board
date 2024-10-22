import NavBar from "@/components/common/NavBar";
import ProfileInfo from "@/components/profile/ProfileInfo";
// import ProfileUpdateForm from "@/components/profile/ProfileUpdateForm";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const isUserAuthenticated = await isAuthenticated();

  if (!isUserAuthenticated) {
    redirect("/api/auth/login");
  }

  const user = await getUser();

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto p-4 flex">
        <div className="flex-1">
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            <ProfileInfo user={user} />
            {/* <ProfileUpdateForm
              initialUsername={user?.given_name || ""}
              initialName={`${user?.given_name || ""} ${
                user?.family_name || ""
              }`}
            /> */}
          </div>
        </div>
      </div>
    </div>
  );
}
