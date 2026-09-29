import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@/lib/utils/supabase/client";
import { processMagicLinkAction } from "@/lib/actions/link/action";
import { createAnonymousGuestSession } from "@/lib/actions/guest/action";
import InvitePage from "./page";

jest.mock("react", () => ({
  ...jest.requireActual<typeof React>("react"),
  useEffect: jest.fn(),
  useMemo: jest.fn(),
  useRef: jest.fn(),
  useState: jest.fn(),
}));
jest.mock("@/lib/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/actions/link/action", () => ({
  processMagicLinkAction: jest.fn(),
}));
jest.mock("@/lib/actions/guest/action", () => ({
  createAnonymousGuestSession: jest.fn(),
}));
jest.mock("@/components/common/Captcha", () => ({ Captcha: () => null }));

let state: unknown[];
let refs: { current: unknown }[];
let cursor: number;
let refCursor: number;
const getUser = jest.fn();
const assign = jest.fn();
const reload = jest.fn();
const reset = jest.fn();
const params = Promise.resolve({ token: "invitation" });
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function render() {
  cursor = 0;
  refCursor = 0;
  jest.mocked(useEffect).mockClear();
  return InvitePage({ params });
}
function effect(index: number) {
  const registered = jest.mocked(useEffect).mock.calls.at(index);
  if (!registered) throw new Error("Effect was not registered");
  return registered[0]();
}

beforeEach(() => {
  jest.clearAllMocks();
  state = [];
  refs = [];
  jest.mocked(useState).mockImplementation((initial?: unknown) => {
    const index = cursor++;
    if (index >= state.length) state.push(initial);
    return [
      state.at(index),
      (value: unknown) => {
        state.splice(index, 1, value);
      },
    ];
  });
  jest.mocked(useRef).mockImplementation((initial: unknown) => {
    const index = refCursor++;
    const ref = refs.at(index) ?? { current: initial };
    refs.splice(index, 1, ref);
    return ref;
  });
  jest.mocked(useMemo).mockImplementation((factory) => factory());
  jest
    .mocked(createClient)
    .mockReturnValue({ auth: { getUser } } as unknown as ReturnType<
      typeof createClient
    >);
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { assign, reload },
  });
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

it("shows a route error instead of an endless loading screen", async () => {
  cursor = 0;
  refCursor = 0;
  InvitePage({ params: Promise.reject(new Error("route failed")) });
  effect(0);
  await flush();
  const markup = renderToStaticMarkup(render());
  expect(markup).toContain("Failed to load invitation token.");
  expect(markup).not.toContain("Checking authentication");
});

it("shows an authentication failure and permits retry", async () => {
  state = ["invitation"];
  getUser.mockRejectedValueOnce(new Error("offline"));
  render();
  effect(1);
  await flush();
  const markup = renderToStaticMarkup(render());
  expect(markup).toContain("Failed to check authentication.");
  expect(markup).toContain("Try again");
  expect(markup).not.toContain("Checking authentication");
});

it.each([
  ["/board/example", "/board/example"],
  [
    "/invite/error?reason=invalid_or_expired",
    "/invite/error?reason=invalid_or_expired",
  ],
  ["javascript:alert(1)", "/board"],
  ["//example.invalid", "/board"],
  ["/\t/example.invalid", "/board"],
])(
  "navigates safely for %s and starts only once",
  async (redirectUrl, expected) => {
    state = ["invitation", "authenticated"];
    jest
      .mocked(processMagicLinkAction)
      .mockResolvedValueOnce({ success: true, redirectUrl });
    render();
    effect(2);
    effect(2);
    await flush();
    expect(processMagicLinkAction).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(expected);
  }
);

it("shows a failed invitation without navigating", async () => {
  state = ["invitation", "authenticated"];
  jest
    .mocked(processMagicLinkAction)
    .mockRejectedValueOnce(new Error("offline"));
  render();
  effect(2);
  await flush();
  expect(renderToStaticMarkup(render())).toContain(
    "Failed to process invitation."
  );
  expect(assign).not.toHaveBeenCalled();
});

it("resets CAPTCHA after guest failure and prevents duplicate creation", async () => {
  state = ["invitation", "needs_guest", "captcha"];
  jest
    .mocked(createAnonymousGuestSession)
    .mockResolvedValueOnce({ success: false, error: "Guest creation failed" });
  render();
  refs[0].current = { reset };
  effect(3);
  effect(3);
  await flush();
  expect(createAnonymousGuestSession).toHaveBeenCalledTimes(1);
  expect(reset).toHaveBeenCalledTimes(1);
  expect(reload).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(render())).toContain("Guest creation failed");
});
