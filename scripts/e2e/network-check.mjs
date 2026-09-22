import assert from "node:assert/strict";
import { createConnection } from "node:net";

export async function canConnect(host, port = 443) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(3000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

export async function checkBlockedNetwork(browserCheck = false) {
  for (const host of ["1.1.1.1", "example.com"]) {
    assert.equal(
      await canConnect(host),
      false,
      "Runtime must not reach external TCP endpoints"
    );
  }
  if (browserCheck) {
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      // Deliberately no Playwright routes: this checks the Docker boundary itself.
      for (const url of ["http://1.1.1.1", "https://example.com"]) {
        await assert.rejects(page.goto(url, { timeout: 5000 }), (error) =>
          /ERR_(?:ADDRESS_UNREACHABLE|INTERNET_DISCONNECTED|CONNECTION_(?:REFUSED|TIMED_OUT)|NAME_NOT_RESOLVED)|Timeout/i.test(
            error.message
          )
        );
      }
    } finally {
      await browser.close();
    }
  }
  console.log(
    browserCheck
      ? "Node and Chromium runtime egress is blocked."
      : "Service namespace egress is blocked."
  );
}

if (process.argv.includes("--probe")) await checkBlockedNetwork();
if (process.argv.includes("--positive-control")) {
  assert.equal(
    await canConnect("1.1.1.1"),
    true,
    "The external probe must be reachable before isolation"
  );
  console.log("External TCP positive control passed.");
}
