import { fetchBoards } from "@/lib/db/board";
import BoardList from "./BoardList";
import HomeProvider from "./HomeProvider";

interface BoardListWrapperProps {
  userId: string;
}

/**
 * Server component wrapper that fetches board data and provides it to the client-side BoardList.
 * This allows the board list to be streamed independently using Suspense.
 */
export default async function BoardListWrapper({
  userId,
}: Readonly<BoardListWrapperProps>) {
  // Direct fetch without retry - faster initial load
  // Errors will be caught by error boundary
  const boardList = await fetchBoards(userId);

  return (
    <HomeProvider initialBoards={boardList}>
      <BoardList />
    </HomeProvider>
  );
}
