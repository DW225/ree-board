import { md5 } from "./md5";

describe("md5 function", () => {
  // Test empty string
  test("should hash empty string correctly", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  // Test standard strings with known hashes
  test('should hash "hello" correctly', () => {
    expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  test('should hash "The quick brown fox jumps over the lazy dog" correctly', () => {
    expect(md5("The quick brown fox jumps over the lazy dog")).toBe(
      "9e107d9d372bb6826bd81d3542a419d6"
    );
  });

  test('should hash "The quick brown fox jumps over the lazy dog." correctly', () => {
    // One dot changes the entire hash
    expect(md5("The quick brown fox jumps over the lazy dog.")).toBe(
      "e4d909c290d0fb1ca068ffaddf22cbd0"
    );
  });

  // Test numeric inputs
  test('should hash numeric string "123456" correctly', () => {
    expect(md5("123456")).toBe("e10adc3949ba59abbe56e057f20f883e");
  });

  // Test longer strings
  test("should hash a longer string correctly", () => {
    const longString = "a".repeat(1000);
    expect(md5(longString)).toBe("cabe45dcc9ae5b66ba86600cca6b8ba8");
  });

  // Test multi-byte Unicode characters
  test("should handle Unicode characters correctly", () => {
    expect(md5("こんにちは")).toBe("c0e89a293bd36c7a768e4e9d2c5475a8");
  });

  test("should handle emoji correctly", () => {
    expect(md5("😀👍🏼💯")).toBe("314f65063c860deff40b6aa4566861f2");
  });

  // Test surrogate pairs
  test("should handle surrogate pairs correctly", () => {
    // This string contains characters that use surrogate pairs in JavaScript
    expect(md5("𝄞𝄞𝄞")).toBe("2fede738d3fc53190acebc8d17215011");
  });

  // Test strings that will cause buffer boundaries to be hit
  test("should handle strings that fill the buffer (63 chars)", () => {
    const string63 = "a".repeat(63);
    expect(md5(string63)).toBe("b06521f39153d618550606be297466d5");
  });

  test("should handle strings that exactly fill the buffer (64 chars)", () => {
    const string64 = "a".repeat(64);
    expect(md5(string64)).toBe("014842d480b571495a4a0363793f7367");
  });

  test("should handle strings that exceed the buffer (65 chars)", () => {
    const string65 = "a".repeat(65);
    expect(md5(string65)).toBe("c743a45e0d2e6a95cb859adae0248435");
  });
});
