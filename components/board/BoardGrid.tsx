import { PostType } from "@/lib/constants/post";
import type { Board } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import type { FC } from "react";
import BoardColumn from "./BoardColumn";

interface BoardGridProps {
  boardId: Board["id"];
  viewOnly?: boolean;
  userId: User["id"];
}

const COLUMN_CONFIG: Record<PostType, { label: string; accentColor: string }> =
  {
    [PostType.went_well]: { label: "Went Well", accentColor: "#10B981" },
    [PostType.to_improvement]: {
      label: "To Improve",
      accentColor: "#EF4444",
    },
    [PostType.to_discuss]: { label: "To Discuss", accentColor: "#F59E0B" },
    [PostType.action_item]: {
      label: "Action Items",
      accentColor: "#8B5CF6",
    },
  };

const BoardGrid: FC<BoardGridProps> = ({ boardId, viewOnly, userId }) => {
  const columns = [
    {
      title: COLUMN_CONFIG[PostType.went_well].label,
      postType: PostType.went_well,
    },
    {
      title: COLUMN_CONFIG[PostType.to_improvement].label,
      postType: PostType.to_improvement,
    },
    {
      title: COLUMN_CONFIG[PostType.to_discuss].label,
      postType: PostType.to_discuss,
    },
    {
      title: COLUMN_CONFIG[PostType.action_item].label,
      postType: PostType.action_item,
    },
  ];

  return (
    <div className="flex flex-wrap -mx-2">
      {columns.map((column) => (
        <div
          key={column.postType}
          className="h-full w-full md:w-1/2 lg:w-1/4 px-1 mb-4 transition-all ease-in-out"
        >
          <BoardColumn
            title={column.title}
            postType={column.postType}
            boardId={boardId}
            viewOnly={viewOnly}
            userId={userId}
            accentColor={COLUMN_CONFIG[column.postType].accentColor}
          />
        </div>
      ))}
    </div>
  );
};

export default BoardGrid;
