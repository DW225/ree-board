import { PostType } from "@/lib/constants/post";
import type { FC } from "react";
import BoardColumn from "./BoardColumn";

interface BoardGridProps {
  boardId: string;
  viewOnly?: boolean;
  userId: string;
}

const BoardGrid: FC<BoardGridProps> = async ({ boardId, viewOnly, userId }) => {
  const columns = [
    { title: "Went Well", postType: PostType.went_well },
    { title: "To Improve", postType: PostType.to_improvement },
    { title: "To Discuss", postType: PostType.to_discuss },
    { title: "Action Items", postType: PostType.action_item },
  ];

  return (
    <div className="flex flex-wrap -mx-2">
      {columns.map((column) => (
        <div
          key={column.title}
          className="h-full w-full md:w-1/2 lg:w-1/4 px-1 mb-4 transition-all ease-in-out"
        >
          <BoardColumn
            title={column.title}
            postType={column.postType}
            boardId={boardId}
            viewOnly={viewOnly}
            userId={userId}
          />
        </div>
      ))}
    </div>
  );
};

export default BoardGrid;
