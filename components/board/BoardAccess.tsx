import { Role } from "@/db/schema";
import { fetchMembersByBoardID } from "@/lib/db/member";
import MD5 from "crypto-js/md5";
import dynamic from "next/dynamic";
import Image from "next/image";

interface BoardAccessProps {
  boardId: string;
  role: Role;
}

const MemberManageModalComponent = dynamic(
  () => import("@/components/board/MemberManageModalComponent"),
  { ssr: false }
);

export default async function BoardAccess({ boardId, role }: BoardAccessProps) {
  const members = await fetchMembersByBoardID(boardId);
  const memberCount = members.length;

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="avatar-group -space-x-6 rtl:space-x-reverse mr-0.5">
        {members.slice(0, 3).map((member) => (
          <div className="avatar" key={member.id}>
            <div className="w-12">
              <Image
                src={`https://www.gravatar.com/avatar/${MD5(
                  member.email
                )}?d=mp&s=48`}
                alt={`${member.username} avatar`}
                width={48}
                height={48}
              />
            </div>
          </div>
        ))}
        {memberCount > 3 && (
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-12">
              <span>+{memberCount - 3}</span>
            </div>
          </div>
        )}
      </div>
      {role === Role.owner && (
        <MemberManageModalComponent
          boardId={boardId}
        />
      )}
    </div>
  );
}
