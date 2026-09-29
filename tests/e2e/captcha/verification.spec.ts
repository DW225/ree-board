import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { test, expect, run } from "../local/fixtures";
import {
  confirmationLink,
  emailCode,
  mailIds,
  waitForMail,
} from "../local/mail";

test("the real widget and local Auth enforce Turnstile verification", async ({
  page,
  sessions,
}) => {
  const email = `captcha-${randomUUID()}@ree-board.test`;
  const password = `Local-${randomUUID()}!9`;
  const before = await mailIds(email);
  await page.goto("/");
  await page.getByLabel("Full name").fill("CAPTCHA Local User");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const submit = page.getByRole("button", {
    name: "Create account",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: "Verify for local test" })
  ).toHaveCount(0);
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  const submitted = page.waitForResponse(
    (response) =>
      response.url().startsWith(run.supabaseOrigin) &&
      response.url().includes("/auth/v1/signup") &&
      response.request().method() === "POST"
  );
  await submit.click();
  const response = await submitted;
  if (process.env.E2E_CAPTCHA_SCENARIO !== "pass") {
    expect(response.status()).toBeGreaterThanOrEqual(400);
    const reason =
      process.env.E2E_CAPTCHA_SCENARIO === "reject"
        ? "invalid-input-response"
        : "timeout-or-duplicate";
    await expect(
      page.getByText(`captcha protection: request disallowed (${reason})`, {
        exact: true,
      })
    ).toBeVisible();
    expect((await mailIds(email)).size).toBe(before.size);
    const admin = createClient(
      run.supabaseOrigin,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const users = await admin.auth.admin.listUsers();
    expect(Boolean(users.error)).toBe(false);
    expect(users.data.users.some((user) => user.email === email)).toBe(false);
    return;
  }
  expect(response.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Check your email" })
  ).toBeVisible();
  await page.goto(
    confirmationLink(
      (await waitForMail(email, "Ree Board: confirm email", before)).HTML
    )
  );
  await expect(page).toHaveURL(`${run.appOrigin}/board`);
  const login = await (await sessions()).newPage();
  await login.goto("/");
  await login.getByRole("button", { name: "Already have an account?" }).click();
  await login.getByLabel("Email address", { exact: true }).fill(email);
  await login.getByLabel("Password", { exact: true }).fill(password);
  await expect(
    login.getByRole("button", { name: "Sign in", exact: true })
  ).toBeEnabled({ timeout: 30_000 });
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(login).toHaveURL(`${run.appOrigin}/board`);

  const otp = await (await sessions()).newPage();
  await otp.goto("/");
  await otp.getByRole("button", { name: "Already have an account?" }).click();
  await otp.getByRole("button", { name: "Magic Link", exact: true }).click();
  await otp.getByLabel("Email address", { exact: true }).fill(email);
  await expect(
    otp.getByRole("button", { name: "Send code", exact: true })
  ).toBeEnabled({ timeout: 30_000 });
  const sentBefore = await mailIds(email);
  await otp.getByRole("button", { name: "Send code", exact: true }).click();
  await waitForMail(email, "Ree Board: sign-in code", sentBefore);
  await delay(1100);
  const resentBefore = await mailIds(email);
  await otp.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    otp.getByRole("button", { name: "Send code", exact: true })
  ).toBeEnabled({ timeout: 30_000 });
  await otp.getByRole("button", { name: "Send code", exact: true }).click();
  const code = emailCode(
    (await waitForMail(email, "Ree Board: sign-in code", resentBefore)).HTML
  );
  for (let index = 0; index < 6; index++)
    await otp
      .getByLabel(`Digit ${index + 1} of verification code`)
      .fill(code[index]);
  await otp.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(otp).toHaveURL(`${run.appOrigin}/board`);

  await page
    .getByRole("button", { name: /create.*board/i })
    .first()
    .click();
  const title = `CAPTCHA board ${randomUUID()}`;
  await page.getByLabel("Board Name").fill(title);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Board", exact: true })
    .click();
  await page.getByText(title, { exact: true }).click();
  await expect(page).toHaveURL(/\/board\/[^/]+$/);
  const boardUrl = page.url();
  await page.getByRole("button", { name: "Open invite link manager" }).click();
  await page.getByRole("radio", { name: "Guest", exact: true }).click();
  await page
    .getByRole("button", { name: "Create Magic Link", exact: true })
    .click();
  const invite = page.getByRole("dialog").locator("code");
  await expect(invite).toContainText("/invite/");
  const url = new URL((await invite.innerText()).trim());
  expect(url.origin).toBe(run.appOrigin);
  const guest = await (await sessions()).newPage();
  await guest.goto(url.href);
  await expect(guest).toHaveURL(boardUrl, { timeout: 30_000 });
  await expect(
    guest.getByText("Read-only board", { exact: true })
  ).toBeVisible();
});
