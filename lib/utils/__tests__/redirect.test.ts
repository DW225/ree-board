import { getSafeRedirectPath, SafeRedirectPathSchema } from "../redirect";

describe("SafeRedirectPathSchema", () => {
  describe("valid paths", () => {
    it("should accept simple relative paths", () => {
      expect(SafeRedirectPathSchema.parse("/dashboard")).toBe("/dashboard");
      expect(SafeRedirectPathSchema.parse("/board")).toBe("/board");
      expect(SafeRedirectPathSchema.parse("/")).toBe("/");
    });

    it("should accept nested relative paths", () => {
      expect(SafeRedirectPathSchema.parse("/board/123")).toBe("/board/123");
      expect(SafeRedirectPathSchema.parse("/users/profile/settings")).toBe(
        "/users/profile/settings"
      );
    });

    it("should accept paths with query parameters", () => {
      expect(SafeRedirectPathSchema.parse("/board?id=123")).toBe(
        "/board?id=123"
      );
      expect(SafeRedirectPathSchema.parse("/search?q=test&page=2")).toBe(
        "/search?q=test&page=2"
      );
    });

    it("should accept paths with URL-encoded characters", () => {
      expect(SafeRedirectPathSchema.parse("/dashboard%2Fitem")).toBe(
        "/dashboard%2Fitem"
      );
      expect(SafeRedirectPathSchema.parse("/search?q=hello%20world")).toBe(
        "/search?q=hello%20world"
      );
    });

    it("should accept paths with hash fragments", () => {
      expect(SafeRedirectPathSchema.parse("/board#section")).toBe(
        "/board#section"
      );
      expect(SafeRedirectPathSchema.parse("/docs#getting-started")).toBe(
        "/docs#getting-started"
      );
    });
  });

  describe("invalid paths - open redirect attacks", () => {
    it("should reject absolute HTTP URLs", () => {
      const result = SafeRedirectPathSchema.safeParse("http://evil.com");
      expect(result.success).toBe(false);
    });

    it("should reject absolute HTTPS URLs", () => {
      const result = SafeRedirectPathSchema.safeParse("https://evil.com");
      expect(result.success).toBe(false);
    });

    it("should reject protocol-relative URLs", () => {
      const result = SafeRedirectPathSchema.safeParse("//evil.com");
      expect(result.success).toBe(false);
    });

    it("should reject protocol-relative URLs with paths", () => {
      const result = SafeRedirectPathSchema.safeParse("//evil.com/steal");
      expect(result.success).toBe(false);
    });
  });

  describe("invalid paths - protocol injection", () => {
    it("should reject javascript: protocol", () => {
      const result = SafeRedirectPathSchema.safeParse("javascript:alert(1)");
      expect(result.success).toBe(false);
    });

    it("should reject javascript: protocol with capitalization", () => {
      const result = SafeRedirectPathSchema.safeParse("JavaScript:alert(1)");
      expect(result.success).toBe(false);
    });

    it("should reject data: URLs", () => {
      const result = SafeRedirectPathSchema.safeParse(
        "data:text/html,<script>alert(1)</script>"
      );
      expect(result.success).toBe(false);
    });

    it("should reject file: URLs", () => {
      const result = SafeRedirectPathSchema.safeParse("file:///etc/passwd");
      expect(result.success).toBe(false);
    });

    it("should reject vbscript: protocol", () => {
      const result = SafeRedirectPathSchema.safeParse("vbscript:msgbox(1)");
      expect(result.success).toBe(false);
    });

    it("should reject vbscript: protocol with capitalization", () => {
      const result = SafeRedirectPathSchema.safeParse("VBScript:msgbox(1)");
      expect(result.success).toBe(false);
    });
  });

  describe("invalid paths - path traversal attempts", () => {
    it("should reject paths with backslashes", () => {
      const result = SafeRedirectPathSchema.safeParse(String.raw`\evil.com`);
      expect(result.success).toBe(false);
    });

    it("should reject paths with backslash in middle", () => {
      const result = SafeRedirectPathSchema.safeParse(
        String.raw`/path\to\file`
      );
      expect(result.success).toBe(false);
    });

    it("should reject mixed forward/backslashes", () => {
      const result = SafeRedirectPathSchema.safeParse(
        String.raw`/path\evil.com`
      );
      expect(result.success).toBe(false);
    });
  });

  describe("invalid paths - empty or malformed", () => {
    it("should reject empty strings", () => {
      const result = SafeRedirectPathSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject paths not starting with /", () => {
      const result = SafeRedirectPathSchema.safeParse("dashboard");
      expect(result.success).toBe(false);
    });

    it("should reject paths with embedded protocol", () => {
      const result = SafeRedirectPathSchema.safeParse(
        "/path?url=http://evil.com"
      );
      expect(result.success).toBe(false);
    });
  });
});

describe("getSafeRedirectPath", () => {
  const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

  beforeEach(() => {
    consoleWarnSpy.mockClear();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("valid paths", () => {
    it("should return valid relative paths unchanged", () => {
      expect(getSafeRedirectPath("/dashboard")).toBe("/dashboard");
      expect(getSafeRedirectPath("/board/123")).toBe("/board/123");
      expect(getSafeRedirectPath("/")).toBe("/");
    });

    it("should return paths with query parameters", () => {
      expect(getSafeRedirectPath("/search?q=test")).toBe("/search?q=test");
    });

    it("should not log warnings for valid paths", () => {
      getSafeRedirectPath("/dashboard");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("invalid paths - returns default", () => {
    it("should return /board for null", () => {
      expect(getSafeRedirectPath(null)).toBe("/board");
    });

    it("should return /board for absolute URLs", () => {
      expect(getSafeRedirectPath("http://evil.com")).toBe("/board");
      expect(getSafeRedirectPath("https://evil.com")).toBe("/board");
    });

    it("should return /board for protocol-relative URLs", () => {
      expect(getSafeRedirectPath("//evil.com")).toBe("/board");
      expect(getSafeRedirectPath("//evil.com/path")).toBe("/board");
    });

    it("should return /board for javascript: protocol", () => {
      expect(getSafeRedirectPath("javascript:alert(1)")).toBe("/board");
    });

    it("should return /board for data: URLs", () => {
      expect(getSafeRedirectPath("data:text/html,<script>")).toBe("/board");
    });

    it("should return /board for file: URLs", () => {
      expect(getSafeRedirectPath("file:///etc/passwd")).toBe("/board");
    });

    it("should return /board for vbscript: protocol", () => {
      expect(getSafeRedirectPath("vbscript:msgbox(1)")).toBe("/board");
    });

    it("should return /board for paths with backslashes", () => {
      expect(getSafeRedirectPath(String.raw`\evil.com`)).toBe("/board");
      expect(getSafeRedirectPath(String.raw`/path\to\file`)).toBe("/board");
    });

    it("should return /board for empty strings", () => {
      expect(getSafeRedirectPath("")).toBe("/board");
    });

    it("should return /board for paths not starting with /", () => {
      expect(getSafeRedirectPath("dashboard")).toBe("/board");
    });
  });

  describe("security logging", () => {
    it("should log warning when rejecting malicious paths", () => {
      getSafeRedirectPath("https://evil.com");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid redirect path rejected:",
        expect.objectContaining({
          path: "https://evil.com",
        })
      );
    });

    it("should log warning for protocol-relative URLs", () => {
      getSafeRedirectPath("//evil.com");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid redirect path rejected:",
        expect.objectContaining({
          path: "//evil.com",
        })
      );
    });

    it("should not log warning for null paths", () => {
      getSafeRedirectPath(null);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle paths with multiple encoded slashes", () => {
      expect(getSafeRedirectPath("/path%2F%2Fitem")).toBe("/path%2F%2Fitem");
    });

    it("should handle very long valid paths", () => {
      const longPath = "/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z";
      expect(getSafeRedirectPath(longPath)).toBe(longPath);
    });

    it("should handle paths with special characters in query string", () => {
      expect(getSafeRedirectPath("/search?q=a+b&filter=c%26d")).toBe(
        "/search?q=a+b&filter=c%26d"
      );
    });
  });
});
