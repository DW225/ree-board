import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_MOCK !== "1", "Uses the isolated component fixture");

for (const width of [375, 768, 1440]) {
  for (const view of ["board", "grid", "list"]) {
    test(`${view} loading keeps the content layout at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === "http://127.0.0.1:3100"
          ? route.continue()
          : route.abort("blockedbyclient")
      );

      const rectangles = async (stage: string) => {
        await page.goto(
          `/board/mock?review=loading&view=${view}&stage=${stage}&empty`
        );
        if (stage === "ready" && view !== "board") {
          await expect(
            page.getByRole("button", { name: /^Open board:/ })
          ).toHaveCount(4);
        }
        const items = page
          .getByTestId("loading-layout")
          .locator(
            view === "board"
              ? ":scope > div > :last-child > *"
              : ":scope > div > main > :last-child > :last-child > *"
          );
        await expect(items).toHaveCount(4);
        return items.evaluateAll((elements) =>
          elements.map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          })
        );
      };

      const ready = await rectangles("ready");
      for (const stage of view === "board" ? ["route"] : ["route", "content"]) {
        const loading = await rectangles(stage);
        for (let index = 0; index < 4; index += 1) {
          expect(loading[index].x).toBeCloseTo(ready[index].x, 0);
          expect(loading[index].width).toBeCloseTo(ready[index].width, 0);
          // Post counts change column heights; only the first row has a fixed top.
          if (view !== "board" || index === 0) {
            expect(loading[index].y).toBeCloseTo(ready[index].y, 0);
          }
          if (view !== "board") {
            expect(loading[index].height).toBeCloseTo(ready[index].height, 0);
          }
        }
      }
    });
  }
}
