import { Rest } from "ably";

export const ablyClient = (channelID: string) => {
  if (!process.env.ABLY_API_KEY) {
    throw new Error("Missing ably API key");
  }
  const client = new Rest({ key: process.env.ABLY_API_KEY });

  return client.channels.get(channelID);
};

export const EVENT_TYPE = {
  POST: {
    ADD: "ADD",
    UPDATE_CONTENT: "UPDATE_CONTENT",
    DELETE: "DELETE",
    UPDATE_TYPE: "UPDATE_TYPE",
    UPVOTE: "UPVOTE",
    DOWNVOTE: "DOWNVOTE",
  }
}
