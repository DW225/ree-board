import { renderToStaticMarkup } from "react-dom/server";
import HomeProvider from "./HomeProvider";

it("keeps the board list hidden until its signals have been initialized", () => {
  const html = renderToStaticMarkup(
    <HomeProvider initialBoards={[]}>
      <p>No boards yet.</p>
    </HomeProvider>
  );
  expect(html).not.toContain("No boards yet.");
});
