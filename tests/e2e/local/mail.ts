import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { run } from "./fixtures";

const summary = z.object({
  ID: z.string().regex(/^[a-zA-Z0-9-]+$/),
  Subject: z.string(),
  To: z.array(z.object({ Address: z.string() })),
});
const mailList = z.object({ messages: z.array(summary) });

async function list(recipient: string) {
  if (!recipient.endsWith("@ree-board.test"))
    throw new Error("Use a synthetic local recipient");
  const query = encodeURIComponent(`to:${recipient}`);
  const response = await fetch(
    `${run.mailOrigin}/api/v1/search?query=${query}`,
    {
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    }
  );
  if (!response.ok) throw new Error("Local inbox is unavailable");
  return mailList
    .parse(await response.json())
    .messages.filter((message) =>
      message.To.some((address) => address.Address === recipient)
    );
}

export async function mailIds(recipient: string) {
  return new Set((await list(recipient)).map((message) => message.ID));
}

export async function waitForMail(
  recipient: string,
  subject: string,
  before: Set<string>
) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const message = (await list(recipient)).find(
      (item) => item.Subject === subject && !before.has(item.ID)
    );
    if (message) {
      const response = await fetch(
        `${run.mailOrigin}/api/v1/message/${message.ID}`,
        {
          redirect: "error",
          signal: AbortSignal.timeout(3000),
        }
      );
      if (!response.ok) throw new Error("Cannot read the matching local email");
      return z
        .object({ HTML: z.string(), Text: z.string() })
        .parse(await response.json());
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for a new matching local email");
}

export function confirmationLink(
  html: string,
  type: "email" | "recovery" = "email"
) {
  const match = /href="([^"]+)"/.exec(html);
  if (!match) throw new Error("Local confirmation email has no link");
  const url = new URL(match[1].replaceAll("&amp;", "&"));
  if (
    url.origin !== run.appOrigin ||
    url.pathname !== "/api/auth/callback" ||
    url.username ||
    url.password ||
    url.searchParams.has("next") ||
    url.searchParams.has("redirect_to") ||
    url.searchParams.get("type") !== type ||
    !url.searchParams.get("token_hash")
  ) {
    throw new Error("Local confirmation link has an unexpected destination");
  }
  return url.href;
}

export function emailCode(html: string) {
  const match = /data-otp[^>]*>\s*(\d{6})\s*</.exec(html);
  if (!match) throw new Error("Local email does not contain a six-digit code");
  return match[1];
}
