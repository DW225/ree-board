import { validateLocalE2e } from "@/lib/config/localE2e";
import { localMessageSchema } from "@/lib/realtime/localMessage";
import { z } from "zod";
import { Rest } from "ably";

export const ablyClient = (channelID: string) => {
  const local = validateLocalE2e();
  if (local && process.env.NEXT_PUBLIC_E2E_REALTIME_MODE !== "ably") {
    z.string()
      .regex(/^[A-Za-z0-9_-]{1,128}$/)
      .parse(channelID);
    return {
      async publish(value: unknown) {
        const message = localMessageSchema.parse(value);
        const response = await fetch(
          `${local.relayOrigin}/boards/${channelID}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.E2E_RELAY_TOKEN}`,
            },
            body: JSON.stringify(message),
            signal: AbortSignal.timeout(5000),
            redirect: "error",
          }
        );
        if (!response.ok) throw new Error("Local event publication failed");
        // Ably's REST publisher returns an empty result when no serials are supplied.
        return {};
      },
    };
  }
  const key = local ? process.env.ABLY_E2E_API_KEY : process.env.ABLY_API_KEY;
  if (!key) {
    throw new Error("Missing ably API key");
  }
  const client = new Rest({
    key,
  });

  return client.channels.get(`board:${channelID}`);
};

export const EVENT_PREFIX = {
  POST: "POST",
  ACTION: "ACTION",
  MEMBER: "MEMBER",
};

export const EVENT_TYPE = {
  POST: {
    ADD: `${EVENT_PREFIX.POST}_ADD`,
    UPDATE_CONTENT: `${EVENT_PREFIX.POST}_UPDATE_CONTENT`,
    DELETE: `${EVENT_PREFIX.POST}_DELETE`,
    UPDATE_TYPE: `${EVENT_PREFIX.POST}_UPDATE_TYPE`,
    UPVOTE: `${EVENT_PREFIX.POST}_UPVOTE`,
    DOWNVOTE: `${EVENT_PREFIX.POST}_DOWNVOTE`,
    MERGE: `${EVENT_PREFIX.POST}_MERGE`,
  },
  ACTION: {
    CREATE: `${EVENT_PREFIX.ACTION}_CREATE`,
    ASSIGN: `${EVENT_PREFIX.ACTION}_ASSIGN`,
    STATE_UPDATE: `${EVENT_PREFIX.ACTION}_STATE_UPDATE`,
  },
  MEMBER: {
    ADD: `${EVENT_PREFIX.MEMBER}_ADD`,
    UPDATE_ROLE: `${EVENT_PREFIX.MEMBER}_UPDATE_ROLE`,
    DELETE: `${EVENT_PREFIX.MEMBER}_DELETE`,
  },
};
