/// <reference types="jest" />
import { renderToStaticMarkup } from "react-dom/server";
import ProfilePage from "./page";
import BoardLayout from "../board/layout";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { getUserByUserID } from "@/lib/db/user";

jest.mock("@/lib/dal", () => ({
  verifySession: jest.fn(),
  getCurrentUser: jest.fn(),
}));
jest.mock("@/lib/db/user", () => ({ getUserByUserID: jest.fn() }));
jest.mock("@/lib/db/board", () => ({
  fetchBoards: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/components/common/NavBar", () => () => null);
jest.mock("@/components/profile/PersonalInfoCard", () => ({
  PersonalInfoCard: () => null,
}));
jest.mock("@/components/profile/SecurityCard", () => ({
  SecurityCard: () => null,
}));
jest.mock("@/components/profile/DangerZoneCard", () => ({
  DangerZoneCard: () => null,
}));
jest.mock("@/components/guest/UpgradeAccountDialog", () => ({
  UpgradeAccountDialog: () => null,
}));

it.each([
  [true, null],
  [true, new Date("2000-01-01")],
  [false, null],
])(
  "renders the upgrade entry on profile and board pages: %s, %s",
  async (isGuest, guestExpiresAt) => {
    jest.mocked(verifySession).mockResolvedValue({
      isAuth: true,
      isGuest,
      userId: "internal",
      supabaseId: "supabase",
    });
    jest.mocked(getCurrentUser).mockResolvedValue({
      id: "supabase",
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-09-01",
      is_anonymous: isGuest,
      email: "",
      user_metadata: { full_name: "", display_name: "" },
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    jest.mocked(getUserByUserID).mockResolvedValue({
      name: "Guest_Test",
      guestExpiresAt,
      createdAt: new Date("2026-09-01"),
    } as Awaited<ReturnType<typeof getUserByUserID>>);
    const html = renderToStaticMarkup(await ProfilePage());
    expect(html).toContain("Guest_Test");
    if (isGuest && guestExpiresAt) {
      expect(html).toContain("guest account has expired");
      expect(html).not.toContain("access may expire soon");
    }
    expect(html.includes("Upgrade to Keep Access")).toBe(isGuest);
    const board = renderToStaticMarkup(
      await BoardLayout({ children: <div>Board</div> })
    );
    expect(board.includes("Upgrade to Keep Access")).toBe(isGuest);
  }
);
