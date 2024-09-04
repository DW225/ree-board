import { PostType } from "@/db/schema";
import React, { lazy, Suspense } from "react";

const BoardColumn = lazy(() => import("@/components/board/BoardColumn"));

interface BoardGridProps {
  boardID: string;
}

const BoardGrid: React.FC<BoardGridProps> = ({ boardID }) => {
  const columns = [
    { title: "Went Well", postType: PostType.went_well },
    { title: "To Improve", postType: PostType.to_improvement },
    { title: "To Discuss", postType: PostType.to_discuss },
    { title: "Action Items", postType: PostType.action_item },
  ];

  return (
    <div className="flex flex-wrap -mx-2">
      {columns.map((column) => (
        <div key={column.title} className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-4">
          <Suspense
            fallback={
              <div>
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            }
          >
            <BoardColumn
              title={column.title}
              postType={column.postType}
              boardID={boardID}
            />
          </Suspense>
        </div>
      ))}
    </div>
  );
};

export default BoardGrid;
