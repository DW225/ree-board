import { renderToString } from "react-dom/server";
import { Captcha } from "./Captcha";

jest.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => {
    throw new Error("Offline mode must not render Turnstile");
  },
}));

it("renders a local verification control without the Cloudflare widget", () => {
  process.env.NEXT_PUBLIC_E2E_RUN_ID = "run-one";
  try {
    const html = renderToString(
      <Captcha siteKey="local-e2e" onSuccess={() => undefined} />
    );
    expect(html).toContain("Verify for local test");
    expect(html).not.toContain("challenges.cloudflare.com");
  } finally {
    delete process.env.NEXT_PUBLIC_E2E_RUN_ID;
  }
});
