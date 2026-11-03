import { expect, test } from "@playwright/test";
import type { Route } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  test.skip(
    process.env.E2E_MOCK !== "1",
    "Uses the isolated mock board fixture and mocked action responses."
  );
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:3100"
      ? route.continue()
      : route.abort("blockedbyclient")
  );
});

for (const view of ["grid", "list"]) {
  test(`${view}: loads saved settings, saves independent fields, and discards edits`, async ({
    page,
  }) => {
    const requests: unknown[] = [];
    const stored = {
      title: "Saved board",
      description: "Saved notes",
      visibility: "private",
    };
    await page.route("**/mock/board-settings", (route) => {
      const details = route.request().postDataJSON();
      if (requests.length === 1) stored.description = "Saved by another owner";
      Object.assign(stored, details);
      requests.push(details);
      return route.fulfill({
        json: {
          ...stored,
          id: details.boardId,
          teamId: null,
          updatedAt: "2026-10-13T00:00:00Z",
        },
      });
    });
    await page.goto(`/board/mock?review=board-settings&view=${view}`);
    const open = async () => {
      await page.getByRole("button", { name: "Board actions" }).click();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    };
    const dialog = page.getByRole("dialog", { name: "Edit Board" });
    const description = dialog.getByLabel("Description", { exact: true });
    const save = dialog.getByRole("button", { name: "Save Changes" });
    await open();
    await expect(description).toHaveValue("Saved notes");
    await expect(description).toHaveAttribute("maxlength", "2000");
    await expect(
      dialog.getByRole("button", { name: "Private", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await description.fill("Updated notes\nNext steps");
    await save.click();
    await expect(dialog).toBeHidden();
    expect(requests).toEqual([
      {
        boardId: "board-settings-test01",
        description: "Updated notes\nNext steps",
      },
    ]);
    await open();
    await expect(description).toHaveValue("Updated notes\nNext steps");
    await dialog.getByRole("button", { name: "Team", exact: true }).click();
    await save.click();
    await expect(dialog).toBeHidden();
    expect(requests[1]).toEqual({
      boardId: "board-settings-test01",
      visibility: "team",
    });
    await open();
    await expect(description).toHaveValue("Saved by another owner");
    await expect(
      dialog.getByRole("button", { name: "Team", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await description.fill("");
    await save.click();
    await expect(dialog).toBeHidden();
    expect(requests[2]).toMatchObject({ description: null });
    await open();
    await expect(description).toHaveValue("");
    await description.fill("Discard me");
    await dialog.getByRole("button", { name: "Private", exact: true }).click();
    await dialog.getByRole("button", { name: "Discard", exact: true }).click();
    await open();
    await expect(description).toHaveValue("");
    await expect(
      dialog.getByRole("button", { name: "Team", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await save.click();
    await expect(dialog).toBeHidden();
    expect(requests).toHaveLength(3);
  });
}

test("pending settings prevent repeat submits and keep the draft after failure for retry", async ({
  page,
}) => {
  const pending = Promise.withResolvers<Route>();
  let requests = 0;
  await page.route("**/mock/board-settings", (route) => {
    requests += 1;
    pending.resolve(route);
  });
  await page.goto("/board/mock?review=board-settings");
  await page.getByRole("button", { name: "Board actions" }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Board" });
  const title = dialog.getByLabel("Board Name");
  const description = dialog.getByLabel("Description", { exact: true });
  await title.fill("Updated board");
  await description.fill("Draft notes");
  await dialog.getByRole("button", { name: "Team", exact: true }).click();
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  const request = await pending.promise;
  await expect(title).toBeDisabled();
  await expect(description).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Private", exact: true })
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Saving..." })
  ).toBeDisabled();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  expect(requests).toBe(1);
  await request.fulfill({ status: 500, body: "Save failed" });
  await expect(
    page.getByText("Failed to update board. Please try again.")
  ).toBeVisible();
  await expect(title).toBeEnabled();
  await expect(title).toHaveValue("Updated board");
  await expect(description).toHaveValue("Draft notes");
  await expect(
    dialog.getByRole("button", { name: "Team", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", {
      name: "Saved board",
      exact: true,
      includeHidden: true,
    })
  ).toBeVisible();
  await page.unroute("**/mock/board-settings");
  await page.route("**/mock/board-settings", (route) =>
    route.fulfill({
      json: {
        id: "board-settings-test01",
        title: "Updated board",
        description: "Draft notes",
        visibility: "team",
        teamId: null,
        updatedAt: "2026-10-13T00:00:00Z",
      },
    })
  );
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Updated board", exact: true })
  ).toBeVisible();
  await expect(page.getByText("Board updated successfully")).toBeVisible();
});

for (const view of ["grid", "list"]) {
  test(`${view}: visibility filters apply, combine, discard, and reset`, async ({
    page,
  }) => {
    await page.goto(`/board/mock?review=board-settings&filters&view=${view}`);
    const filter = page.getByRole("button", { name: "Filter", exact: true });
    const visibility = page.getByRole("group", {
      name: "Visibility",
      exact: true,
    });
    const saved = page.getByText("Saved board", { exact: true });
    const team = page.getByText("Team board", { exact: true });
    const apply = page.getByRole("button", { name: "Apply Filters" });
    await filter.click();
    await visibility.getByLabel("Team", { exact: true }).check();
    await page.getByRole("button", { name: "Close filter panel" }).click();
    await expect(saved).toBeVisible();
    await expect(team).toBeVisible();
    await filter.click();
    await expect(visibility.getByLabel("All", { exact: true })).toBeChecked();
    await visibility.getByLabel("Private", { exact: true }).check();
    await apply.click();
    await expect(saved).toBeVisible();
    await expect(team).toHaveCount(0);
    await page.getByRole("button", { name: "Remove Private filter" }).click();
    await expect(team).toBeVisible();
    await filter.click();
    await visibility.getByLabel("Team", { exact: true }).check();
    await apply.click();
    await expect(saved).toHaveCount(0);
    await expect(team).toBeVisible();
    await page.getByRole("textbox", { name: "Search boards" }).fill("Saved");
    await expect(page.getByText("No boards match your filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear all", exact: true }).click();
    await expect(saved).toBeVisible();
    await expect(team).toBeVisible();
    await filter.click();
    await visibility.getByLabel("Private", { exact: true }).check();
    await apply.click();
    await filter.click();
    await expect(
      visibility.getByLabel("Private", { exact: true })
    ).toBeChecked();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(saved).toBeVisible();
    await expect(team).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clear all", exact: true })
    ).toHaveCount(0);
  });
}

test("creation defaults to private and retains an explicit team choice on failure", async ({
  page,
}) => {
  const requests: { visibility: string }[] = [];
  const pending = Promise.withResolvers<Route>();
  await page.route("**/mock/create-board", (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 2) {
      pending.resolve(route);
      return;
    }
    return route.fulfill({ status: 200, body: "OK" });
  });
  await page.goto("/board/mock?review=board-settings");
  const open = page.getByRole("button", { name: /Create new board/ });
  const dialog = page.getByRole("dialog", {
    name: "Create Board",
    exact: true,
  });
  const title = dialog.getByLabel("Board Name");
  const privateOption = dialog.getByRole("radio", {
    name: "Private",
    exact: true,
  });
  const teamOption = dialog.getByRole("radio", { name: "Team", exact: true });
  const submit = dialog.getByRole("button", {
    name: "Create Board",
    exact: true,
  });
  await open.click();
  await expect(privateOption).toBeChecked();
  await title.fill("New private board");
  await submit.click();
  await expect(dialog).toBeHidden();
  expect(requests[0].visibility).toBe("private");
  await open.click();
  await dialog.getByText("Team", { exact: true }).click();
  await expect(teamOption).toBeChecked();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await open.click();
  await expect(privateOption).toBeChecked();
  await title.fill("New team board");
  await dialog.getByText("Team", { exact: true }).click();
  await submit.click();
  const request = await pending.promise;
  await expect(teamOption).toBeDisabled();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  expect(requests).toHaveLength(2);
  await request.fulfill({ status: 500, body: "Create failed" });
  await expect(
    page.getByText("Failed to create board. Please try again.")
  ).toBeVisible();
  await expect(teamOption).toBeChecked();
  await expect(teamOption).toBeEnabled();
  await expect(title).toHaveValue("New team board");
  await submit.click();
  await expect(dialog).toBeHidden();
  expect(requests[2].visibility).toBe("team");
});
