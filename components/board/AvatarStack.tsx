import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Role } from "@/db/schema";
import MD5 from "crypto-js/md5";

interface AvatarStackProps {
  members: {
    id: string;
    userId: string;
    role: Role;
    username: string;
    email: string;
    updateAt: Date;
  }[];
}

export default async function AvatarStack({
  members,
}: Readonly<AvatarStackProps>) {
  const memberCount = members.length;

  return (
    <div className="flex -space-x-3 hover:-space-x-1 transition-all duration-200 cursor-pointer">
      {members.slice(0, 5).map((member, index) => (
        <Avatar key={index} className="border-2 border-background">
          <AvatarImage
            src={`https://www.gravatar.com/avatar/${MD5(
              member.email
            )}?d=mp&s=48`}
            alt={member.username}
          />
          <AvatarFallback>
            {member.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {memberCount > 5 && (
        <Avatar className="border-2 border-background">
          <AvatarFallback>+{members.length - 5}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
