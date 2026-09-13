import { expect, test } from "@playwright/test";
import type { Route } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  test.skip(process.env.E2E_MOCK !== "1");
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== "http://127.0.0.1:3100") {
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
});

for (const fails of [false, true]) {
  test(`vote and removal ${fails ? "restore state after failure" : "save state after success"}`, async ({
    page,
  }) => {
    let pending = Promise.withResolvers<Route>();
    let requests = 0;
    await page.route("**/mock/vote", (route) => {
      requests += 1;
      pending.resolve(route);
    });
    await page.goto("/board/mock");
    const card = page.getByTestId("post-mock-post");
    const vote = card.getByRole("button", {
      name: /^(Vote for this post|Remove vote)$/,
    });

    for (const removing of [false, true]) {
      await vote.click();
      const request = await pending.promise;
      await expect(vote).toBeDisabled();
      await expect(vote).toHaveAttribute("aria-pressed", String(!removing));
      await expect(vote).toHaveText(removing ? "0" : "1");
      await vote.evaluate((element) => (element as HTMLButtonElement).click());
      expect(requests).toBe(removing ? (fails ? 3 : 2) : 1);
      await request.fulfill({ status: fails ? 500 : 204 });
      await expect(vote).toBeEnabled();
      await expect(vote).toHaveAttribute(
        "aria-pressed",
        String(fails ? removing : !removing)
      );
      await expect(vote).toHaveText((fails ? removing : !removing) ? "1" : "0");
      pending = Promise.withResolvers<Route>();

      if (fails) {
        await expect(
          page.getByText("Failed to vote.", { exact: true }).first()
        ).toBeVisible();
      }
      if (fails && !removing) {
        // Save a vote so the next failure tests removal of an existing vote.
        await vote.click();
        await (await pending.promise).fulfill({ status: 204 });
        await expect(vote).toBeEnabled();
        pending = Promise.withResolvers<Route>();
      }
    }
  });
}

test("board guest cannot submit a vote", async ({ page }) => {
  let requests = 0;
  await page.route("**/mock/vote", (route) => {
    requests += 1;
    return route.fulfill({ status: 204 });
  });
  await page.goto("/board/mock?guest");
  const vote = page
    .getByTestId("post-mock-post")
    .getByRole("button", { name: "Vote for this post" });
  await expect(vote).toBeDisabled();
  await vote.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(vote).toHaveText("0");
  expect(requests).toBe(0);
});
