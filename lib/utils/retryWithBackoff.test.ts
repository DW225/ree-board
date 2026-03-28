import { retryWithBackoff } from "./retryWithBackoff";

describe("retryWithBackoff", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("returns result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("success");
    const result = await retryWithBackoff(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure and succeeds", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("success");

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const error = new Error("persistent failure");
    const fn = jest.fn().mockRejectedValue(error);

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100 });
    promise.catch(() => undefined);
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow("persistent failure");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects maxRetries option", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("fail"));

    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 100 });
    promise.catch(() => undefined);
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff delays", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("success");

    const setTimeoutSpy = jest.spyOn(global, "setTimeout");

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelay: 100,
      factor: 2,
    });
    await jest.runAllTimersAsync();
    await promise;

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
  });
});
