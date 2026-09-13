import { renderToStaticMarkup } from "react-dom/server";
import Navbar from "./NavBar";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

jest.mock("@/hooks/useSupabaseSession", () => ({
  useSupabaseSession: jest.fn(),
}));
jest.mock("@/lib/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({}),
  usePathname: () => "/board",
}));

it.each([42, {}, null, "", "  "])(
  "renders a guest fallback for invalid name %j",
  (full_name) => {
    jest.mocked(useSupabaseSession).mockReturnValue({
      user: { is_anonymous: true, email: "", user_metadata: { full_name } },
    } as unknown as ReturnType<typeof useSupabaseSession>);
    const html = renderToStaticMarkup(<Navbar />);
    expect(html).toContain(">G</span>");
  }
);

it("renders initials from a valid name", () => {
  jest.mocked(useSupabaseSession).mockReturnValue({
    user: { is_anonymous: false, user_metadata: { full_name: "  Jane Doe  " } },
  } as unknown as ReturnType<typeof useSupabaseSession>);
  expect(renderToStaticMarkup(<Navbar />)).toContain(">JD</span>");
});
