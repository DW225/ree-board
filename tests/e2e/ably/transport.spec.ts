import { randomUUID } from "node:crypto";
import { Realtime } from "ably";
import type { TokenRequest } from "ably";
import { z } from "zod";
import { test, expect } from "../local/fixtures";
import { signUp, createBoard } from "../local/helpers";

const requestSchema = z.object({
  keyName: z.string(),
  clientId: z.string(),
  ttl: z.number(),
  timestamp: z.number(),
  nonce: z.string(),
  mac: z.string(),
  capability: z.string(),
});

test("real Ably tokens restrict capabilities and renew membership on reconnect", async ({
  page,
  sessions,
}) => {
  await signUp(page);
  const memberContext = await sessions();
  const memberPage = await memberContext.newPage();
  const member = await signUp(memberPage);
  const boardPath = await createBoard(page, `Ably test ${randomUUID()}`);
  const boardId = boardPath.split("/").at(-1)!;
  expect((await memberContext.request.post("/api/ably/token")).status()).toBe(
    403
  );
  await page.getByRole("button", { name: "View board members" }).click();
  await page.getByPlaceholder("name@example.com").fill(member.email);
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  await expect(page.getByText("Member invited successfully.")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await memberPage.goto(boardPath);

  async function token(): Promise<TokenRequest> {
    const response = await memberContext.request.post("/api/ably/token");
    if (!response.ok()) throw new Error("Local token route denied access");
    const request = requestSchema.parse(await response.json());
    expect(request.keyName).toBe(process.env.ABLY_E2E_KEY_ID);
    expect(request.ttl).toBe(60_000);
    expect(JSON.parse(request.capability)).toEqual({
      [`board:${boardId}`]: ["subscribe"],
    });
    return request;
  }
  const client = new Realtime({
    authCallback: (_, callback) => {
      token().then(
        (value) => callback(null, value),
        () => callback("Token request denied", null)
      );
    },
    autoConnect: false,
    logLevel: 0,
  });
  const channel = client.channels.get(`board:${boardId}`);
  const received: string[] = [];
  try {
    client.connect();
    await channel.subscribe((message) => received.push(String(message.data)));
    await channel.attach();
    await expect(channel.publish("untrusted", "denied")).rejects.toBeDefined();
    await expect(
      client.channels.get(`board:${randomUUID()}`).attach()
    ).rejects.toBeDefined();

    const content = `Real Ably delivery ${randomUUID()}`;
    await page
      .getByRole("button", { name: "Add a card", exact: true })
      .first()
      .click();
    await page.getByPlaceholder("What went well this sprint?").fill(content);
    await page.getByRole("button", { name: "Add card", exact: true }).click();
    await expect
      .poll(() => received.filter((value) => value.includes(content)).length)
      .toBe(1);
    await expect(memberPage.getByText(content, { exact: true })).toHaveCount(1);
    const renewed = await client.auth.authorize();
    expect(JSON.parse(renewed.capability!)).toEqual({
      [`board:${boardId}`]: ["subscribe"],
    });
    client.connection.close();
    await expect.poll(() => client.connection.state).toBe("closed");
    client.connect();
    await channel.attach();
    const after = `After reconnect ${randomUUID()}`;
    await page.getByPlaceholder("What went well this sprint?").fill(after);
    await page.getByRole("button", { name: "Add card", exact: true }).click();
    await expect
      .poll(() => received.filter((value) => value.includes(after)).length)
      .toBe(1);

    await page.getByRole("button", { name: "View board members" }).click();
    await page.getByPlaceholder("Search Members").fill(member.email);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Remove Member", exact: true })
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(page.getByText("Member removed.")).toBeVisible();
    expect((await memberContext.request.post("/api/ably/token")).status()).toBe(
      403
    );
    await expect
      .poll(() => client.connection.state, { timeout: 75_000 })
      .toMatch(/failed|suspended|disconnected/);
  } finally {
    client.close();
  }
});
