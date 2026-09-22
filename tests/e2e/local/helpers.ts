import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, run } from "./fixtures";
import { confirmationLink, mailIds, waitForMail } from "./mail";

export async function signUp(page: Page) {
  const email = `user-${randomUUID()}@ree-board.test`;
  const password = `Local-${randomUUID()}!9`;
  const before = await mailIds(email);
  await page.goto("/");
  await page.getByLabel("Full name").fill("Local Test User");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const submit = page.getByRole("button", {
    name: "Create account",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: "Verify for local test" }).click();
  await page.getByRole("button", { name: "Test expiration" }).click();
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: "Verify for local test" }).click();
  await page.getByRole("button", { name: "Test error", exact: true }).click();
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: "Verify for local test" }).click();
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Check your email" })
  ).toBeVisible();
  const mail = await waitForMail(email, "Ree Board: confirm email", before);
  await page.goto(confirmationLink(mail.HTML));
  await expect(page).toHaveURL(`${run.appOrigin}/board`);
  return { email, password };
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Already have an account?" }).click();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Verify for local test" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${run.appOrigin}/board`);
}

export async function createBoard(page: Page, title: string) {
  await page
    .getByRole("button", { name: /create.*board/i })
    .first()
    .click();
  await page.getByLabel("Board Name").fill(title);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Board", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByText(title, { exact: true }).click();
  await expect(page).toHaveURL(/\/board\/[^/]+$/);
  if (process.env.NEXT_PUBLIC_E2E_REALTIME_MODE !== "ably")
    await expect(page.getByTestId("local-realtime-status")).toHaveText(
      "Connected"
    );
  return new URL(page.url()).pathname;
}
