import { Rest } from "ably";

export const ablyClient = (channelID: string) => {
  if (!process.env.ABLY_API_KEY) {
    throw new Error("Missing ably API key");
  }
  const client = new Rest({
    key: process.env.ABLY_API_KEY,
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
