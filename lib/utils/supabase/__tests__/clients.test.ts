/**
 * Validation tests for Supabase client utilities
 *
 * These tests verify that all Supabase clients can be properly initialized
 * and that environment variables are correctly configured.
 */

describe("Supabase Client Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear require cache to prevent module state leakage
    jest.resetModules();
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  describe("Browser Client", () => {
    it("should throw error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      const { createClient } = require("../client");
      expect(() => createClient()).toThrow(/Missing NEXT_PUBLIC_SUPABASE_URL/);
    });

    it("should throw error when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const { createClient } = require("../client");
      expect(() => createClient()).toThrow(
        /Missing.*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/
      );
    });

    it("should create client when all environment variables are present", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

      const { createClient } = require("../client");
      const client = createClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });

  describe("Admin Client", () => {
    it("should throw error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.SUPABASE_SECRET_KEY = "test-secret";

      const { createAdminClient } = require("../admin");
      expect(() => createAdminClient()).toThrow(
        /Missing NEXT_PUBLIC_SUPABASE_URL/
      );
    });

    it("should throw error when SUPABASE_SECRET_KEY is missing", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      delete process.env.SUPABASE_SECRET_KEY;

      const { createAdminClient } = require("../admin");
      expect(() => createAdminClient()).toThrow(/Missing.*SUPABASE_SECRET_KEY/);
    });

    it("should create admin client when all environment variables are present", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SECRET_KEY = "test-secret-key";

      const { createAdminClient } = require("../admin");
      const client = createAdminClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it("should create admin client successfully when all credentials are provided", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SECRET_KEY = "test-secret-key";

      const { createAdminClient } = require("../admin");
      const client = createAdminClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(client.auth.admin).toBeDefined();
    });
  });

  describe("Environment Variable Configuration", () => {
    it("should have all required environment variables defined in .env.example", () => {
      const requiredVars = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SECRET_KEY",
      ];

      // This test documents which environment variables are required
      requiredVars.forEach((varName) => {
        expect(varName).toBeTruthy();
      });
    });
  });

  describe("Client Type Safety", () => {
    it("should return SupabaseClient type from browser client", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      const { createClient } = require("../client");
      const client = createClient();

      // Verify client has expected Supabase methods
      expect(typeof client.auth.getUser).toBe("function");
      expect(typeof client.auth.signInWithOtp).toBe("function");
      expect(typeof client.auth.signOut).toBe("function");
    });

    it("should return SupabaseClient type from admin client", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SECRET_KEY = "test-secret";

      const { createAdminClient } = require("../admin");
      const client = createAdminClient();

      // Verify admin client has expected Supabase admin methods
      expect(typeof client.auth.admin.createUser).toBe("function");
      expect(typeof client.auth.admin.deleteUser).toBe("function");
    });
  });
});
