import type { validateLocalE2e } from "./lib/config/localE2e";

const mockValidateLocalE2e: jest.MockedFunction<typeof validateLocalE2e> =
  jest.fn();
jest.mock("./envConfig", () => ({}));
jest.mock("./lib/config/localE2e", () => ({
  validateLocalE2e: mockValidateLocalE2e,
}));
jest.mock("drizzle-kit", () => ({ defineConfig: (config: unknown) => config }));

function config() {
  let result:
    { dbCredentials: { url: string; authToken?: string } } | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    result = require("./drizzle.config").default;
  });
  if (!result) throw new Error("Config was not loaded");
  return result;
}
beforeEach(() => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    NODE_ENV: "production",
  });
  mockValidateLocalE2e.mockReset();
});
afterEach(() => jest.restoreAllMocks());
it.each([undefined, ""])(
  "rejects missing or empty production URL (%s)",
  (url) => {
    if (url === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = url;
    expect(config).toThrow("Missing TURSO_DATABASE_URL environment variable");
  }
);
it("keeps the configured production destination", () => {
  process.env.TURSO_DATABASE_URL = "libsql://configured.invalid";
  expect(config().dbCredentials.url).toBe("libsql://configured.invalid");
});
it("keeps the development file destination", () => {
  jest.replaceProperty(process, "env", { NODE_ENV: "development" });
  expect(config().dbCredentials.url).toBe("file:test.db");
});
it("keeps the validated local E2E destination", () => {
  mockValidateLocalE2e.mockReturnValue({
    libsqlOrigin: "http://127.0.0.1:19080",
  } as ReturnType<typeof validateLocalE2e>);
  expect(config().dbCredentials).toEqual({ url: "http://127.0.0.1:19080" });
});
