import { fetchBoards } from "@/lib/db/board";
import { verifySession } from "@/lib/dal";
import { retryWithBackoff } from "@/lib/utils/retryWithBackoff";
import BoardList from "./BoardList";
import HomeProvider from "./HomeProvider";

/**
 * Server component wrapper that fetches board data and provides it to the client-side BoardList.
 * This allows the board list to be streamed independently using Suspense.
 */
export default async function BoardListWrapper() {
  const session = await verifySession();

  const boardList = await retryWithBackoff(
    async () => {
      return await fetchBoards(session.kindeId);
    },
    { maxRetries: 3, initialDelay: 500 }
  );

  return (
    <HomeProvider initialBoards={boardList}>
      <BoardList />
    </HomeProvider>
  );
}
