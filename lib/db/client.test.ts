// Use dynamic require (not static import) so we can set env vars and mocks
// before the client module initializes
type ClientModule = typeof import("./client");

let isTransientError: ClientModule["isTransientError"];
let withDbRetry: ClientModule["withDbRetry"];

beforeAll(() => {
  process.env.TURSO_DATABASE_URL = "http://mock-db";
  jest.resetModules();
  jest.doMock("@libsql/client", () => ({
    createClient: jest.fn(() => ({})),
  }));
  jest.doMock("drizzle-orm/libsql", () => ({
    drizzle: jest.fn(() => ({})),
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const client = require("./client") as ClientModule;
  isTransientError = client.isTransientError;
  withDbRetry = client.withDbRetry;
});

afterAll(() => {
  delete process.env.TURSO_DATABASE_URL;
  jest.resetModules();
});

describe("isTransientError", () => {
  it("returns true for ECONNRESET errors", () => {
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
  });

  it("returns true for ECONNREFUSED errors", () => {
    expect(isTransientError(new Error("ECONNREFUSED"))).toBe(true);
  });

  it("returns true for ETIMEDOUT errors", () => {
    expect(isTransientError(new Error("ETIMEDOUT"))).toBe(true);
  });

  it("returns true for socket hang up errors", () => {
    expect(isTransientError(new Error("socket hang up"))).toBe(true);
  });

  it("returns false for non-transient errors", () => {
    expect(isTransientError(new Error("SQL syntax error near 'foo'"))).toBe(
      false,
    );
  });

  it("returns false for non-Error values", () => {
    expect(isTransientError("some string")).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(42)).toBe(false);
  });
});

describe("withDbRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("returns result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withDbRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on ECONNRESET and returns result on eventual success", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValue("ok");

    const promise = withDbRetry(fn);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-transient errors", async () => {
    const error = new Error("SQL syntax error");
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withDbRetry(fn)).rejects.toThrow("SQL syntax error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all retries on persistent transient errors", async () => {
    const error = new Error("ECONNRESET");
    const fn = jest.fn().mockRejectedValue(error);

    const promise = withDbRetry(fn);
    // Suppress unhandled rejection warning while timers advance
    promise.catch(() => undefined);
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow("ECONNRESET");
    // DB_MAX_RETRIES = 3
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
