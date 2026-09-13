/// <reference types="jest" />
import { verifySession } from "@/lib/dal";
import { convertGuestToUser, getUserBySupabaseId } from "@/lib/db/user";
import { createClient } from "@/lib/utils/supabase/server";
import { upgradeGuestAccount, verifyGuestUpgradeOTP } from "./action";

jest.mock("@/lib/utils/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/db/user", () => ({
  convertGuestToUser: jest.fn(),
  getUserBySupabaseId: jest.fn(),
}));
jest.mock("@/lib/utils/logger", () => ({ logger: { debug: jest.fn() } }));
jest.mock("@/lib/db/member", () => ({ checkMemberRole: jest.fn() }));
jest.mock("@/lib/db/client", () => ({
  db: { update: jest.fn(() => ({ set: () => ({ where: jest.fn() }) })) },
}));
jest.mock("nanoid", () => ({ nanoid: () => "unused" }));

const guest = {
  id: "supabase-guest",
  is_anonymous: true,
  email: "",
  email_confirmed_at: null,
};
const member = {
  ...guest,
  is_anonymous: false,
  email: "member@example.com",
  email_confirmed_at: "2026-09-12T00:00:00Z",
};
const getUser = jest.fn();
const verifyOtp = jest.fn();
const updateUser = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: "internal-guest",
    supabaseId: guest.id,
    isGuest: true,
  });
  jest
    .mocked(getUserBySupabaseId)
    .mockResolvedValue({ id: "internal-guest", isGuest: true } as Awaited<
      ReturnType<typeof getUserBySupabaseId>
    >);
  jest.mocked(createClient).mockResolvedValue({
    auth: { getUser, verifyOtp, updateUser },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  getUser
    .mockReset()
    .mockResolvedValueOnce({ data: { user: guest } })
    .mockResolvedValue({ data: { user: member } });
  verifyOtp.mockResolvedValue({ data: { user: member }, error: null });
  updateUser.mockResolvedValue({ error: null });
});

it("confirms an email change and retains the original account identity", async () => {
  await expect(
    verifyGuestUpgradeOTP(member.email, "123456", " New Name ")
  ).resolves.toEqual({ success: true });
  expect(verifyOtp).toHaveBeenCalledWith({
    email: member.email,
    token: "123456",
    type: "email_change",
  });
  expect(updateUser).toHaveBeenCalledWith({
    data: { full_name: "New Name", display_name: "New Name", name: "New Name" },
  });
  expect(convertGuestToUser).toHaveBeenCalledWith(
    guest.id,
    member.email,
    "New Name"
  );
});

it.each([
  { ...member, id: "another-account" },
  { ...member, is_anonymous: true },
  { ...member, email: "another@example.com" },
  { ...member, email_confirmed_at: null },
])("does not convert a mismatched or unverified account %j", async (user) => {
  getUser
    .mockReset()
    .mockResolvedValueOnce({ data: { user: guest } })
    .mockResolvedValue({ data: { user } });
  const result = await verifyGuestUpgradeOTP(member.email, "123456", "Name");
  expect(result.success).toBe(false);
  expect(convertGuestToUser).not.toHaveBeenCalled();
});

it("does not convert after an invalid code", async () => {
  verifyOtp.mockResolvedValue({ error: { message: "Invalid code" } });
  const error = jest.spyOn(console, "error").mockImplementation();
  try {
    expect(
      (await verifyGuestUpgradeOTP(member.email, "123456", "Name")).success
    ).toBe(false);
    expect(convertGuestToUser).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});

it("can finish a verified upgrade after a failed local save without reusing an OTP", async () => {
  getUser.mockReset().mockResolvedValue({ data: { user: member } });
  expect(
    (await verifyGuestUpgradeOTP(member.email, "123456", "Name")).success
  ).toBe(true);
  expect(verifyOtp).not.toHaveBeenCalled();
  expect(convertGuestToUser).toHaveBeenCalledWith(
    guest.id,
    member.email,
    "Name"
  );
});

it("sends an email-change code only for the authenticated local guest", async () => {
  expect(await upgradeGuestAccount(member.email)).toEqual({
    success: true,
    needsOtp: true,
  });
  expect(updateUser).toHaveBeenCalledWith({ email: member.email });
});

it("rejects a local account that does not match the session", async () => {
  jest
    .mocked(getUserBySupabaseId)
    .mockResolvedValue({ id: "other", isGuest: true } as Awaited<
      ReturnType<typeof getUserBySupabaseId>
    >);
  expect((await upgradeGuestAccount(member.email)).success).toBe(false);
  expect(
    (await verifyGuestUpgradeOTP(member.email, "123456", "Name")).success
  ).toBe(false);
  expect(updateUser).not.toHaveBeenCalled();
  expect(convertGuestToUser).not.toHaveBeenCalled();
});

it("can reopen and finish an upgrade after email verification", async () => {
  getUser.mockReset().mockResolvedValue({ data: { user: member } });
  expect(await upgradeGuestAccount(member.email)).toEqual({
    success: true,
    needsOtp: true,
    emailVerified: true,
  });
  expect((await verifyGuestUpgradeOTP(member.email, "", "Name")).success).toBe(
    true
  );
  expect(verifyOtp).not.toHaveBeenCalled();
});

it("keeps the local guest account if the profile update fails", async () => {
  updateUser.mockResolvedValue({ error: { message: "Try again" } });
  expect(await verifyGuestUpgradeOTP(member.email, "123456", "Name")).toEqual({
    success: false,
    error: "Try again",
  });
  expect(convertGuestToUser).not.toHaveBeenCalled();
});
