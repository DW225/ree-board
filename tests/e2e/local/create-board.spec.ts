import { randomUUID } from "node:crypto";
import type { Route } from "@playwright/test";
import { test, expect, run } from "./fixtures";
import { signUp } from "./helpers";

for (const dismissal of ["Escape", "backdrop"] as const) {
  test(`pending board creation ignores ${dismissal} and preserves the draft for retry`, async ({
    page,
  }) => {
    await signUp(page);
    const boardTitle = `Pending retro ${randomUUID()}`;
    const pending: { route?: Route } = {};
    const actionUrl = `${run.appOrigin}/board`;
    const holdCreate = (route: Route) => {
      const request = route.request();
      if (
        request.method() === "POST" &&
        request.headers()["next-action"] &&
        request.postData()?.includes(boardTitle)
      ) {
        pending.route = route;
        return;
      }
      return route.fallback();
    };
    await page.route(actionUrl, holdCreate);
    try {
      const open = page.getByRole("button", { name: /create.*board/i }).first();
      await open.click();
      const dialog = page.getByRole("dialog", {
        name: "Create Board",
        exact: true,
      });
      const title = dialog.getByLabel("Board Name");
      const submit = dialog.getByRole("button", {
        name: "Create Board",
        exact: true,
      });
      await title.fill(boardTitle);
      await submit.click();
      await expect.poll(() => Boolean(pending.route)).toBe(true);
      await expect(title).toBeDisabled();

      const dismiss = () =>
        dismissal === "Escape"
          ? page.keyboard.press("Escape")
          : page.mouse.click(5, 5);
      await dismiss();
      await expect(dialog).toBeVisible();
      await expect(title).toHaveValue(boardTitle);

      await pending.route!.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Create unavailable",
      });
      pending.route = undefined;
      await page.unroute(actionUrl, holdCreate);
      await expect(
        page.getByText("Failed to create board. Please try again.")
      ).toBeVisible();
      await expect(title).toBeEnabled();
      await expect(title).toHaveValue(boardTitle);
      await expect(page.getByText(boardTitle, { exact: true })).toHaveCount(0);

      await submit.click();
      await expect(dialog).toBeHidden();
      await page.reload();
      await expect(page.getByText(boardTitle, { exact: true })).toBeVisible();

      await open.click();
      await expect(title).toHaveValue("");
      await title.fill("Discard this draft");
      await dismiss();
      await expect(dialog).toBeHidden();
      await open.click();
      await expect(title).toHaveValue("");
    } finally {
      await pending.route?.abort().catch(() => undefined);
      await page.unroute(actionUrl, holdCreate);
    }
  });
}
