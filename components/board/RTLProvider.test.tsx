/// <reference types="jest" />
import { renderToString } from "react-dom/server";
import { Realtime } from "ably";
import RTLProvider from "./RTLProvider";

it("renders on Node without opening a realtime connection", () => {
  const connect = jest.spyOn(Realtime.prototype, "connect");
  const warn = jest.spyOn(console, "warn");
  try {
    const html = renderToString(
      <RTLProvider boardId="board-a">
        <span>Board content</span>
      </RTLProvider>
    );
    expect(html).toContain("Board content");
    expect(connect).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  } finally {
    connect.mockRestore();
    warn.mockRestore();
  }
});
