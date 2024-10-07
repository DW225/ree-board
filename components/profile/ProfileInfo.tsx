import type { KindeUserBase } from "@kinde-oss/kinde-auth-nextjs/types";
import Image from "next/image";

interface ProfileInfoProps {
  user: KindeUserBase;
}

export default function ProfileInfo({ user }: Readonly<ProfileInfoProps>) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">About</h2>
      <div className="flex items-center mb-4">
        <Image
          src={user?.picture ?? "https://www.gravatar.com/avatar/?d=mp"}
          alt="Profile"
          className="w-16 h-16 rounded-full mr-4"
          width={32}
          height={32}
        />
        <div>
          <p className="font-bold">
            {user?.given_name} {user?.family_name}
          </p>
          <p className="text-gray-600">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}
