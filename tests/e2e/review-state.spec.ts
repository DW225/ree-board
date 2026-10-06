import { expect, test } from "@playwright/test";
import type { Route } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // These cases exercise isolated service fixtures, not live accounts or boards.
  test.skip(process.env.E2E_MOCK !== "1");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:3100"
      ? route.continue()
      : route.abort("blockedbyclient")
  );
  const now = new Date("2026-09-08T00:00:00Z");
  await page.clock.install({ time: now });
  await page.route("**/api/board/mock/links", (route) =>
    route.fulfill({
      json: {
        links: [
          {
            id: 1,
            token: "fixture-token",
            boardId: "mock",
            role: 1,
            creator: null,
            creatorName: "Test Member",
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 30_000).toISOString(),
            isExpired: false,
            expiresIn: "1 minute",
          },
        ],
        count: 1,
      },
    })
  );
});

test("expiration updates link state without discarding an open upgrade form", async ({
  page,
}) => {
  await page.goto("/board/mock?review=expiration");
  await expect(
    page.getByRole("button", { name: "Copy invite link" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Upgrade to Keep Access" }).click();
  await page.getByLabel("Email Address").fill("guest@example.invalid");
  await page.getByRole("button", { name: "Send Verification Code" }).click();
  await page.getByLabel("Verification Code", { exact: true }).fill("123456");
  await page.getByLabel("Display Name").fill("Test Guest");
  await page.clock.runFor(61_000);
  await expect(
    page.getByRole("dialog", { name: "Verify Your Email" })
  ).toBeVisible();
  await expect(
    page.getByLabel("Verification Code", { exact: true })
  ).toHaveValue("123456");
  await expect(page.getByLabel("Display Name")).toHaveValue("Test Guest");
  await expect(page.getByRole("dialog")).toContainText("guest@example.invalid");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Upgrade to Keep Access" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy invite link" })
  ).toHaveCount(0);
  await expect(page.getByText("1 expired", { exact: true })).toBeVisible();
});

test("expiration text updates across the 24-hour warning boundary", async ({
  page,
}) => {
  await page.route("**/api/board/mock/links", (route) =>
    route.fulfill({
      json: {
        links: [
          {
            id: 1,
            token: "fixture-token",
            boardId: "mock",
            role: 1,
            creator: null,
            creatorName: "Test Member",
            createdAt: "2026-09-08T00:00:00Z",
            expiresAt: "2026-09-09T00:00:30Z",
            isExpired: false,
            expiresIn: "1 day",
          },
        ],
        count: 1,
      },
    })
  );
  await page.goto("/board/mock?review=expiration");
  await expect(
    page.getByText("Expires in 1 day", { exact: true })
  ).toBeVisible();
  await page.clock.runFor(61_000);
  await expect(
    page.getByText("Expires in 23 hours", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("Expires in 1 day", { exact: true })).toHaveCount(
    0
  );
  await expect(
    page.getByRole("button", { name: "Copy invite link" })
  ).toBeEnabled();
});

test("expiration updates an already open revoke dialog", async ({ page }) => {
  await page.goto("/board/mock?review=expiration");
  await page.getByRole("button", { name: "Revoke magic link" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "can currently be used to join"
  );
  await page.clock.runFor(61_000);
  await expect(page.getByRole("dialog")).not.toContainText(
    "can currently be used to join"
  );
  await expect(
    page.getByRole("dialog").getByText("Expired", { exact: true })
  ).toBeVisible();
});

for (const imported of [0, 1]) {
  test(`member import adds only the ${imported} saved members`, async ({
    page,
  }) => {
    await page.route("**/mock/boards", (route) =>
      route.fulfill({ json: [{ id: "source", title: "Source Board" }] })
    );
    await page.route("**/mock/members", (route) =>
      route.fulfill({
        json: [
          {
            id: "source-a",
            userId: "user-a",
            role: 0,
            username: "Member A",
            email: "a@example.invalid",
            boardId: "source",
            boardTitle: "Source Board",
          },
          {
            id: "source-b",
            userId: "user-b",
            role: 1,
            username: "Member B",
            email: "b@example.invalid",
            boardId: "source",
            boardTitle: "Source Board",
          },
        ],
      })
    );
    await page.route("**/mock/import", (route) =>
      route.fulfill({
        json: {
          imported,
          skipped: 2 - imported,
          members: imported
            ? [{ id: "saved-a", userId: "user-a", role: 0 }]
            : [],
        },
      })
    );
    await page.goto("/board/mock?review=members");
    await page
      .getByRole("button", { name: "Import from Other Boards" })
      .click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Source Board" }).click();
    await expect(page.getByRole("button", { name: /Member A/ })).toContainText(
      "owner"
    );
    await expect(page.getByRole("button", { name: /Member B/ })).toContainText(
      "member"
    );
    await page.getByRole("button", { name: "Select all", exact: true }).click();
    const importRequest = page.waitForRequest("**/mock/import");
    await page
      .getByRole("button", { name: "Import 2 Members", exact: true })
      .click();
    expect((await importRequest).postDataJSON()).toEqual({
      boardId: "mock",
      sourceBoardId: "source",
      userIds: ["user-a", "user-b"],
    });
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Member A", { exact: true })).toHaveCount(
      imported
    );
    await expect(page.getByText("Member B", { exact: true })).toHaveCount(0);
    if (imported) {
      await expect(page.getByText("Owner", { exact: true })).toBeVisible();
    }
    await expect(
      page.getByText(`Successfully imported ${imported} members`, {
        exact: false,
      })
    ).toBeVisible();
  });
}

for (const staleResult of ["success", "failure"]) {
  test(`member loads ignore a stale ${staleResult} after closing and reopening`, async ({
    page,
  }) => {
    await page.route("**/mock/boards", (route) =>
      route.fulfill({
        json: [
          { id: "a", title: "Board A" },
          { id: "b", title: "Board B" },
        ],
      })
    );
    const oldRequest = Promise.withResolvers<Route>();
    await page.route("**/mock/members", (route) => {
      if (route.request().postData() === "a") {
        oldRequest.resolve(route);
        return;
      }
      return route.fulfill({
        json: [
          {
            id: "member-b",
            userId: "user-b",
            role: 1,
            username: "Member B",
            email: "b@example.invalid",
            boardId: "b",
            boardTitle: "Board B",
          },
        ],
      });
    });
    await page.goto("/board/mock?review=members");
    await page
      .getByRole("button", { name: "Import from Other Boards" })
      .click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Board A" }).click();
    const pending = await oldRequest.promise;
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Import from Other Boards" })
      .click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Board B" }).click();
    await expect(page.getByRole("button", { name: /Member B/ })).toBeVisible();
    if (staleResult === "success") {
      await pending.fulfill({
        json: [
          {
            id: "member-a",
            userId: "user-a",
            role: 1,
            username: "Member A",
            email: "a@example.invalid",
            boardId: "a",
            boardTitle: "Board A",
          },
        ],
      });
    } else {
      await pending.abort("failed");
    }
    await expect(page.getByRole("combobox")).toHaveText("Board B");
    await expect(page.getByRole("button", { name: /Member B/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Member A/ })).toHaveCount(0);
    await expect(
      page.getByText("Failed to load board members", { exact: true })
    ).toHaveCount(0);
  });
}

test("member selection clears when a new source board loads and is empty", async ({
  page,
}) => {
  await page.route("**/mock/boards", (route) =>
    route.fulfill({
      json: [
        { id: "a", title: "Board A" },
        { id: "b", title: "Board B" },
      ],
    })
  );
  const emptyRequest = Promise.withResolvers<Route>();
  await page.route("**/mock/members", (route) => {
    if (route.request().postData() === "b") {
      emptyRequest.resolve(route);
      return;
    }
    return route.fulfill({
      json: [
        {
          id: "guest-a",
          userId: "user-a",
          role: 2,
          username: "Guest A",
          email: "a@example.invalid",
          boardId: "a",
          boardTitle: "Board A",
        },
      ],
    });
  });
  await page.goto("/board/mock?review=members");
  await page.getByRole("button", { name: "Import from Other Boards" }).click();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Board A" }).click();
  const guest = page.getByRole("button", { name: /Guest A/ });
  await expect(guest).toContainText("guest");
  await guest.click();
  await expect(
    page.getByRole("button", { name: "Import 1 Member", exact: true })
  ).toBeEnabled();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Board B" }).click();
  const pending = await emptyRequest.promise;
  await expect(
    page.getByText("Loading members...", { exact: true })
  ).toBeVisible();
  await expect(guest).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Import 0 Members", exact: true })
  ).toBeDisabled();
  await expect(page.getByRole("combobox")).toBeDisabled();
  await pending.fulfill({ json: [] });
  await expect(
    page.getByText("No members found in this board", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Loading members...", { exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Import 0 Members", exact: true })
  ).toBeDisabled();
  await expect(page.getByRole("combobox")).toBeEnabled();
});

test("member role controls keep the saved role after failure and allow retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/api/user/**", (route) => route.fulfill({ json: {} }));
  const pending = Promise.withResolvers<Route>();
  await page.route("**/mock/member-role", (route) => {
    pending.resolve(route);
  });
  await page.goto("/board/mock?review=member-roles");
  await page.getByRole("button", { name: "View board members" }).click();
  const role = page.getByRole("combobox", { name: "Role for Alex" });
  await expect(role).toHaveText("Member");
  await role.click();
  await page.getByRole("option", { name: "Guest", exact: true }).click();
  const request = await pending.promise;
  expect(request.request().postDataJSON()).toEqual({
    boardId: "mock",
    userId: "alex",
    role: 2,
  });
  await expect(role).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Saving role...");
  await request.fulfill({ status: 500, body: "Save failed" });
  await expect(
    page.getByText("Could not update member role. Please try again.")
  ).toBeVisible();
  await expect(role).toBeEnabled();
  await expect(role).toHaveText("Member");
  await page.unroute("**/mock/member-role");
  await page.route("**/mock/member-role", (route) =>
    route.fulfill({
      json: {
        ok: true,
        member: { id: "alex-membership", userId: "alex", role: 0 },
      },
    })
  );
  await role.click();
  await page.getByRole("option", { name: "Owner", exact: true }).click();
  await expect(role).toHaveText("Owner");
  await expect(page.getByText("Member role updated.")).toBeVisible();
  await page
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "View board members" }).click();
  await expect(role).toHaveText("Owner");
  await page.unroute("**/mock/member-role");
  await page.route("**/mock/member-role", (route) =>
    route.fulfill({
      json: { ok: false, error: "The board must have at least one owner." },
    })
  );
  await role.click();
  await page.getByRole("option", { name: "Guest", exact: true }).click();
  await expect(
    page.getByText("The board must have at least one owner.")
  ).toBeVisible();
  await expect(role).toBeEnabled();
  await expect(role).toHaveText("Owner");
});
