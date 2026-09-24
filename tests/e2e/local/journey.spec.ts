import { createClient as createSqlClient } from "@libsql/client";
import { createClient as createAuthClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Role } from "../../../lib/constants/role";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { signUp, signIn, createBoard } from "./helpers";
import { test, expect, run } from "./fixtures";
import { relayFault, serviceFault } from "./faults";
import { confirmationLink, emailCode, mailIds, waitForMail } from "./mail";

test("local confirmation, password login, board persistence and collaboration", async ({
  page,
  sessions,
}) => {
  test.setTimeout(150_000);
  const owner = await signUp(page);
  const memberContext = await sessions();
  const memberPage = await memberContext.newPage();
  const member = await signUp(memberPage);
  const boardPath = await createBoard(page, `Local board ${randomUUID()}`);
  const boardId = boardPath.split("/").at(-1)!;

  // A real signed-in outsider cannot subscribe.
  expect(
    (await memberContext.request.get(`/api/e2e/realtime/${boardId}`)).status()
  ).toBe(403);
  const anonymous = await sessions();
  expect(
    (await anonymous.request.get(`/api/e2e/realtime/${boardId}`)).status()
  ).toBe(401);
  expect((await anonymous.request.get("/monitoring")).status()).toBe(404);

  await page.getByRole("button", { name: "View board members" }).click();
  await page.getByPlaceholder("name@example.com").fill(member.email);
  const ownerLookup = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      !!request.headers()["next-action"] &&
      !!request.postData()?.includes(member.email)
  );
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  const lookupAction = await ownerLookup;
  await expect(page.getByText("Member invited successfully.")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await memberPage.goto(boardPath);
  await expect(memberPage.getByTestId("local-realtime-status")).toHaveText(
    "Connected"
  );

  const ownerOnlyDenied = await memberContext.request.post(boardPath, {
    headers: {
      "next-action": lookupAction.headers()["next-action"],
      "content-type": lookupAction.headers()["content-type"],
      origin: run.appOrigin,
    },
    data: lookupAction.postData()!,
  });
  expect(ownerOnlyDenied.status()).toBeGreaterThanOrEqual(400);
  const otherBoardPage = await page.context().newPage();
  await otherBoardPage.goto("/board");
  await createBoard(otherBoardPage, `Separate board ${randomUUID()}`);

  const content = `Saved locally ${randomUUID()}`;
  await page
    .getByRole("button", { name: "Add a card", exact: true })
    .first()
    .click();
  await page.getByPlaceholder("What went well this sprint?").fill(content);
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await expect(memberPage.getByText(content, { exact: true })).toHaveCount(1);
  await expect(otherBoardPage.getByText(content, { exact: true })).toHaveCount(
    0
  );
  await page.reload();
  await expect(page.getByTestId("local-realtime-status")).toHaveText(
    "Connected"
  );
  await expect(page.getByText(content, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const edited = `${content} edited`;
  await page.getByRole("textbox", { name: "Edit post content" }).fill(edited);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(memberPage.getByText(edited, { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Vote for this post", exact: true })
    .click();
  await expect(
    memberPage.getByRole("button", { name: "Vote for this post", exact: true })
  ).toHaveText("1");

  const returningPage = await (await sessions()).newPage();
  await signIn(returningPage, owner.email, owner.password);
  await returningPage.goto(boardPath);
  await expect(returningPage.getByText(edited, { exact: true })).toBeVisible();
  await expect(
    returningPage.getByRole("button", { name: "Remove vote", exact: true })
  ).toHaveText("1");
  await returningPage.close();
  await otherBoardPage.close();

  const taskContent = `Action item ${randomUUID()}`;
  await page
    .getByRole("button", { name: "Add a card", exact: true })
    .last()
    .click();
  await page.getByPlaceholder("Describe the action item...").fill(taskContent);
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  const task = page.getByTestId(/^post-/).filter({ hasText: taskContent });
  const memberTask = memberPage
    .getByTestId(/^post-/)
    .filter({ hasText: taskContent });
  await expect(memberTask).toBeVisible();
  await task.getByRole("button", { name: "Assign task to member" }).click();
  await page.getByLabel("Search members").fill(member.email);
  await page
    .getByRole("dialog")
    .getByRole("button")
    .filter({ hasText: member.email })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Assign Task", exact: true })
    .click();
  await expect(page.getByText("Task assigned", { exact: true })).toBeVisible();
  await task.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Status", exact: true }).hover();
  await page.getByRole("menuitem", { name: "Done", exact: true }).click();
  await expect(memberTask.getByText("Done", { exact: true })).toBeVisible();

  const sql = createSqlClient({ url: run.libsqlOrigin });
  try {
    const savedTask = await sql.execute({
      sql: "SELECT action.user_id FROM action JOIN post ON post.id = action.post_id JOIN user ON user.id = action.user_id WHERE post.content = ? AND user.email = ?",
      args: [taskContent, member.email],
    });
    expect(savedTask.rows).toHaveLength(1);
    await page.reload();
    await expect(page.getByTestId("local-realtime-status")).toHaveText(
      "Connected"
    );
    await expect(task.getByText("Done", { exact: true })).toBeVisible();

    // Notification loss must not turn a successful database write into a duplicate retry.
    const missed = `Saved despite notification loss ${randomUUID()}`;
    await relayFault("fail-next-publish");
    await page
      .getByRole("button", { name: "Add a card", exact: true })
      .first()
      .click();
    await page.getByPlaceholder("What went well this sprint?").fill(missed);
    await page.getByRole("button", { name: "Add card", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add card", exact: true })
    ).toBeDisabled();
    await expect
      .poll(
        async () =>
          (
            await sql.execute({
              sql: "SELECT id FROM post WHERE content = ?",
              args: [missed],
            })
          ).rows.length
      )
      .toBe(1);
    await expect(memberPage.getByText(missed, { exact: true })).toHaveCount(0);
    await memberPage.reload();
    await expect(memberPage.getByText(missed, { exact: true })).toBeVisible();
    await expect(memberPage.getByTestId("local-realtime-status")).toHaveText(
      "Connected"
    );
    const draft = "Keep this draft through reconnect";
    await memberPage
      .getByRole("button", { name: "Add a card", exact: true })
      .first()
      .click();
    await memberPage
      .getByPlaceholder("What went well this sprint?")
      .fill(draft);
    let resumeStream = () => {};
    const reconnectGate = new Promise<void>((resolve) => {
      resumeStream = resolve;
    });
    const streamPath = `**/api/e2e/realtime/${boardId}`;
    await memberPage.route(streamPath, async (route) => {
      await reconnectGate;
      await route.continue();
    });
    await relayFault("disconnect");
    const duringDisconnect = `Saved while disconnected ${randomUUID()}`;
    try {
      await expect(memberPage.getByTestId("local-realtime-status")).toHaveText(
        "Reconnecting"
      );
      await page
        .getByPlaceholder("What went well this sprint?")
        .fill(duringDisconnect);
      await page.getByRole("button", { name: "Add card", exact: true }).click();
      await expect(
        page.getByTestId(/^post-/).filter({ hasText: duringDisconnect })
      ).toBeVisible();
      await expect(
        page.getByPlaceholder("What went well this sprint?")
      ).toBeEnabled();
      await expect(
        memberPage.getByText(duringDisconnect, { exact: true })
      ).toHaveCount(0);
    } finally {
      resumeStream();
    }
    await expect(memberPage.getByTestId("local-realtime-status")).toHaveText(
      "Connected"
    );
    await expect(
      memberPage.getByText(duringDisconnect, { exact: true })
    ).toHaveCount(1);
    await expect(
      memberPage.getByPlaceholder("What went well this sprint?")
    ).toHaveValue(draft);
    await memberPage.unroute(streamPath);

    const failed = `Database unavailable ${randomUUID()}`;
    await page.getByPlaceholder("What went well this sprint?").fill(failed);
    await serviceFault("sql", "stop");
    try {
      await page.getByRole("button", { name: "Add card", exact: true }).click();
      await expect(
        page.getByText("Failed to create a post. Please try again later.", {
          exact: true,
        })
      ).toBeVisible();
      await expect(
        page.getByPlaceholder("What went well this sprint?")
      ).toHaveValue(failed);
    } finally {
      await serviceFault("sql", "start");
    }
    await expect
      .poll(async () => {
        try {
          return (await sql.execute("SELECT 1")).rows.length;
        } catch {
          return 0;
        }
      })
      .toBe(1);
    expect(
      (
        await sql.execute({
          sql: "SELECT id FROM post WHERE content = ?",
          args: [failed],
        })
      ).rows
    ).toHaveLength(0);
    await page.getByRole("button", { name: "Add card", exact: true }).click();
    await expect(memberPage.getByText(failed, { exact: true })).toHaveCount(1);

    const card = page.getByTestId(/^post-/).filter({ hasText: edited });
    await card.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(memberPage.getByText(edited, { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("local-realtime-status")).toHaveText(
      "Connected"
    );
    await expect(page.getByText(edited, { exact: true })).toHaveCount(0);
    expect(
      (
        await sql.execute({
          sql: "SELECT id FROM post WHERE content = ?",
          args: [edited],
        })
      ).rows
    ).toHaveLength(0);

    await page.getByRole("button", { name: "View board members" }).click();
    await page.getByPlaceholder("Search Members").fill(member.email);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    const revoked = memberPage.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/e2e/realtime/${boardId}`) &&
        response.status() === 403,
      { timeout: 65_000 }
    );
    await page
      .getByRole("dialog", { name: "Remove Member", exact: true })
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(
      page.getByText("Member removed.", { exact: true })
    ).toBeVisible();
    expect(
      (await memberContext.request.get(`/api/e2e/realtime/${boardId}`)).status()
    ).toBe(403);
    await revoked;
    await expect(memberPage.getByTestId("local-realtime-status")).toHaveText(
      "Reconnecting"
    );
  } finally {
    sql.close();
  }
});

test("real email resend, single-use OTP, recovery, refresh and sign-out", async ({
  page,
  sessions,
}) => {
  test.setTimeout(210_000);
  const account = await signUp(page);
  const loginPage = await (await sessions()).newPage();
  await loginPage.goto("/");
  await loginPage
    .getByRole("button", { name: "Already have an account?" })
    .click();
  await loginPage
    .getByRole("button", { name: "Magic Link", exact: true })
    .click();
  await loginPage
    .getByLabel("Email address", { exact: true })
    .fill(account.email);
  const before = await mailIds(account.email);
  await loginPage
    .getByRole("button", { name: "Verify for local test" })
    .click();
  await serviceFault("mail", "stop");
  try {
    await loginPage
      .getByRole("button", { name: "Send code", exact: true })
      .click();
    await expect(loginPage.getByText(/error sending.*email/i)).toBeVisible({
      timeout: 20_000,
    });
  } finally {
    await serviceFault("mail", "start");
  }
  await expect
    .poll(async () => {
      try {
        return (await fetch(`${run.mailOrigin}/api/v1/messages`)).ok;
      } catch {
        return false;
      }
    })
    .toBe(true);
  await loginPage
    .getByRole("button", { name: "Verify for local test" })
    .click();
  await loginPage
    .getByRole("button", { name: "Send code", exact: true })
    .click();
  const firstMail = await waitForMail(
    account.email,
    "Ree Board: sign-in code",
    before
  );
  if (run.runtime === "container") {
    const expired = emailCode(firstMail.HTML);
    // Use the real Auth clock, not a browser clock override.
    await delay((run.otpExpirySeconds + 1) * 1000);
    for (let index = 0; index < 6; index++)
      await loginPage
        .getByLabel(`Digit ${index + 1} of verification code`)
        .fill(expired[index]);
    await loginPage
      .getByRole("button", { name: "Verify code", exact: true })
      .click();
    await expect(
      loginPage.getByText(/Token has expired or is invalid/i)
    ).toBeVisible();
  }
  const resendBefore = await mailIds(account.email);
  // The local Auth resend limit is one real second, measured by the server clock.
  await delay(1100);
  await loginPage
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await expect(
    loginPage.getByRole("button", { name: "Send code", exact: true })
  ).toBeDisabled();
  await loginPage
    .getByRole("button", { name: "Verify for local test" })
    .click();
  await loginPage
    .getByRole("button", { name: "Send code", exact: true })
    .click();
  const mail = await waitForMail(
    account.email,
    "Ree Board: sign-in code",
    resendBefore
  );
  const code = emailCode(mail.HTML);
  const invalid = code === "000000" ? "111111" : "000000";
  for (let index = 0; index < 6; index++) {
    await loginPage
      .getByLabel(`Digit ${index + 1} of verification code`)
      .fill(invalid[index]);
  }
  await loginPage
    .getByRole("button", { name: "Verify code", exact: true })
    .click();
  await expect(
    loginPage.getByText(/Token has expired or is invalid/i)
  ).toBeVisible();
  for (let index = 0; index < 6; index++) {
    await loginPage
      .getByLabel(`Digit ${index + 1} of verification code`)
      .fill(code[index]);
  }
  await loginPage
    .getByRole("button", { name: "Verify code", exact: true })
    .click();
  await expect(loginPage).toHaveURL(`${run.appOrigin}/board`);
  await loginPage.reload();
  await expect(loginPage).toHaveURL(`${run.appOrigin}/board`);

  const auth = createAuthClient(
    run.supabaseOrigin,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
  const reused = await auth.auth.verifyOtp({
    email: account.email,
    token: code,
    type: "email",
  });
  expect(Boolean(reused.error)).toBe(true);
  expect(Boolean(reused.data.session)).toBe(false);

  // The app has a recovery screen but no request form. Use the real public Auth API to send the email.
  await delay(1100); // Recovery shares Auth's real email-send limit.
  const recoveryBefore = await mailIds(account.email);
  const recovery = await auth.auth.resetPasswordForEmail(account.email);
  expect(recovery.error?.code ?? "ok").toBe("ok");
  const recoveryMail = await waitForMail(
    account.email,
    "Ree Board: reset password",
    recoveryBefore
  );
  await loginPage.goto(confirmationLink(recoveryMail.HTML, "recovery"));
  await expect(loginPage).toHaveURL(`${run.appOrigin}/reset-password`);
  const newPassword = `Recovered-${randomUUID()}!9`;
  await loginPage.getByLabel("New Password", { exact: true }).fill(newPassword);
  await loginPage
    .getByLabel("Confirm New Password", { exact: true })
    .fill(newPassword);
  await loginPage
    .getByRole("button", { name: "Update Password", exact: true })
    .click();
  await expect(
    loginPage.getByRole("heading", { name: "Password Updated!" })
  ).toBeVisible();
  const rejected = await auth.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  expect(Boolean(rejected.error)).toBe(true);
  const recoveredPage = await (await sessions()).newPage();
  await signIn(recoveredPage, account.email, newPassword);
  const recoveredContext = recoveredPage.context();
  let logoutPage = recoveredPage;
  if (run.runtime === "container") {
    const session = async () => {
      const value = (await recoveredContext.cookies())
        .filter((cookie) => /-auth-token(?:\.\d+)?$/.test(cookie.name))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        )
        .map((cookie) => cookie.value)
        .join("");
      expect(value.startsWith("base64-")).toBe(true);
      return z
        .object({
          access_token: z.string(),
          expires_at: z.number(),
          user: z.object({ id: z.string() }),
        })
        .parse(JSON.parse(Buffer.from(value.slice(7), "base64url").toString()));
    };
    const beforeRefresh = await session();
    // Close the page so browser auto-refresh cannot hide a broken server cookie refresh.
    await recoveredPage.close();
    const wait = beforeRefresh.expires_at * 1000 - Date.now() + 1000;
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(121_000);
    await delay(wait);
    const response = await recoveredContext.request.get("/board", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    expect(Boolean(response.headers()["set-cookie"])).toBe(true);
    const afterRefresh = await session();
    expect(afterRefresh.user.id).toBe(beforeRefresh.user.id);
    expect(afterRefresh.expires_at).toBeGreaterThan(beforeRefresh.expires_at);
    // Compare fingerprints so assertion failures cannot print session tokens.
    expect(
      createHash("sha256").update(afterRefresh.access_token).digest("hex")
    ).not.toBe(
      createHash("sha256").update(beforeRefresh.access_token).digest("hex")
    );
    logoutPage = await recoveredContext.newPage();
    await logoutPage.goto("/board");
    await expect(logoutPage).toHaveURL(`${run.appOrigin}/board`);
  }
  await logoutPage
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "LT", exact: true })
    .click();
  await logoutPage
    .getByRole("menuitem", { name: "Log out", exact: true })
    .click();
  await expect(logoutPage).toHaveURL(`${run.appOrigin}/`);
  await logoutPage.goto("/board");
  await expect(logoutPage).toHaveURL(`${run.appOrigin}/?redirect=%2Fboard`);
});

test("anonymous invite uses local CAPTCHA and server actions still reject guest writes", async ({
  page,
  sessions,
}) => {
  await signUp(page);
  const boardPath = await createBoard(page, `Guest board ${randomUUID()}`);
  await page.getByRole("button", { name: "Open invite link manager" }).click();
  await page.getByRole("radio", { name: "Guest", exact: true }).click();
  await page
    .getByRole("button", { name: "Create Magic Link", exact: true })
    .click();
  const code = page.getByRole("dialog").locator("code");
  await expect(code).toContainText("/invite/");
  const invite = new URL((await code.innerText()).trim());
  expect(invite.origin).toBe(run.appOrigin);
  await page.keyboard.press("Escape");

  const guestContext = await sessions();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(invite.href);
  await expect(
    guestPage.getByRole("heading", { name: "Join as Guest" })
  ).toBeVisible();
  await guestPage
    .getByRole("button", { name: "Test error", exact: true })
    .click();
  await expect(
    guestPage.getByText("CAPTCHA verification failed. Please try again.")
  ).toBeVisible();
  await guestPage
    .getByRole("button", { name: "Verify for local test" })
    .click();
  await expect(guestPage).toHaveURL(`${run.appOrigin}${boardPath}`);
  await expect(
    guestPage.getByText("Read-only board", { exact: true })
  ).toBeVisible();
  await expect(guestPage.getByTestId("local-realtime-status")).toHaveText(
    "Connected"
  );
  await expect(
    guestPage.getByRole("button", { name: "Add a card", exact: true })
  ).toHaveCount(0);

  const content = `Owner-only card ${randomUUID()}`;
  await page
    .getByRole("button", { name: "Add a card", exact: true })
    .first()
    .click();
  await page.getByPlaceholder("What went well this sprint?").fill(content);
  const captured = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      !!request.headers()["next-action"] &&
      !!request.postData()?.includes(content)
  );
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  const action = await captured;
  await expect(guestPage.getByText(content, { exact: true })).toBeVisible();

  const sql = createSqlClient({ url: run.libsqlOrigin });
  try {
    const saved = await sql.execute({
      sql: "SELECT id FROM post WHERE content = ?",
      args: [content],
    });
    expect(saved.rows).toHaveLength(1);
    const body = action
      .postData()!
      .replaceAll(String(saved.rows[0].id), nanoid())
      .replaceAll(content, "Guest mutation attempt");
    const denied = await guestContext.request.post(boardPath, {
      headers: {
        "next-action": action.headers()["next-action"],
        "content-type": action.headers()["content-type"],
        origin: run.appOrigin,
      },
      data: body,
    });
    expect(denied.status()).toBeGreaterThanOrEqual(400);
    expect(
      (
        await sql.execute(
          "SELECT id FROM post WHERE content = 'Guest mutation attempt'"
        )
      ).rows
    ).toHaveLength(0);
    const guest = await sql.execute({
      sql: "SELECT user.id, user.supabase_id, user.is_guest FROM user JOIN member ON member.user_id = user.id WHERE member.board_id = ? AND member.role = ?",
      args: [boardPath.split("/").at(-1)!, Role.guest],
    });
    expect(guest.rows).toHaveLength(1);
    expect(guest.rows[0].is_guest).toBe(1);

    const email = `upgraded-${randomUUID()}@ree-board.test`;
    const before = await mailIds(email);
    await guestPage
      .getByRole("button", { name: "Upgrade to Keep Access" })
      .click();
    await guestPage
      .getByRole("dialog")
      .getByLabel("Email Address", { exact: true })
      .fill(email);
    await guestPage
      .getByRole("button", { name: "Send Verification Code", exact: true })
      .click();
    const mail = await waitForMail(
      email,
      "Ree Board: confirm email change",
      before
    );
    await guestPage
      .getByLabel("Verification Code", { exact: true })
      .fill(emailCode(mail.HTML));
    await guestPage
      .getByLabel("Display Name", { exact: true })
      .fill("Upgraded Local Guest");
    await guestPage
      .getByRole("button", { name: "Verify & Upgrade Account", exact: true })
      .click();
    await expect(guestPage.getByRole("dialog")).toBeHidden();
    await expect(
      guestPage.getByRole("button", { name: "Upgrade to Keep Access" })
    ).toHaveCount(0);
    await expect(guestPage.getByText(content, { exact: true })).toBeVisible();
    await expect(
      guestPage.getByText("Read-only board", { exact: true })
    ).toBeVisible();
    const upgraded = await sql.execute({
      sql: "SELECT user.id, user.supabase_id, user.is_guest, user.email, member.role FROM user JOIN member ON member.user_id = user.id WHERE user.id = ? AND member.board_id = ?",
      args: [guest.rows[0].id, boardPath.split("/").at(-1)!],
    });
    expect(upgraded.rows).toEqual([
      { ...guest.rows[0], is_guest: 0, email, role: Role.guest },
    ]);
  } finally {
    sql.close();
  }
});
