import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { PostType } from "@/db/schema";
import dynamic from "next/dynamic";
import React from "react";

const BoardColumn = dynamic(() => import("@/components/board/BoardColumn"), {
  loading: () => <LoadingSpinner />,
});

interface BoardGridProps {
  boardID: string;
  viewOnly?: boolean;
  userId: string;
}

const BoardGrid: React.FC<BoardGridProps> = async ({
  boardID,
  viewOnly,
  userId,
}) => {
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
          className="h-full w-full md:w-1/2 lg:w-1/4 px-1 mb-4"
        >
          <BoardColumn
            title={column.title}
            postType={column.postType}
            boardID={boardID}
            viewOnly={viewOnly}
            userId={userId}
          />
        </div>
      ))}
    </div>
  );
};

export default BoardGrid;
