import { expect, it, jest } from "@jest/globals";
import { ablyClient } from "./ably";

const mockGet = jest.fn();
jest.mock("ably", () => ({
  Rest: jest.fn(() => ({ channels: { get: mockGet } })),
}));

it("publishes on the same namespaced board channel as subscribers", () => {
  const originalKey = process.env.ABLY_API_KEY;
  process.env.ABLY_API_KEY = "test-only";
  try {
    ablyClient("board-a");
    expect(mockGet).toHaveBeenCalledWith("board:board-a");
  } finally {
    if (originalKey === undefined) delete process.env.ABLY_API_KEY;
    else process.env.ABLY_API_KEY = originalKey;
  }
});
