import { renderToStaticMarkup } from "react-dom/server";
import { Role } from "@/lib/constants/role";
import { membersSignal } from "@/lib/signal/memberSignals";
import MemberList from "./MemberList";

beforeEach(() => {
  membersSignal.value = [
    {
      id: "member",
      userId: "user",
      username: "Alex",
      email: "alex@example.com",
      role: Role.member,
    },
  ];
});
afterEach(() => {
  membersSignal.value = [];
});

it("provides a role selector when a board owner can change roles", () => {
  const props = {
    viewOnly: false,
    searchTerm: "",
    handleRoleChange: jest.fn(),
  };
  const html = renderToStaticMarkup(<MemberList {...props} />);
  expect(html).toContain('role="combobox"');
  expect(html).toContain('aria-label="Role for Alex"');
});

it.each([{ viewOnly: true }, { viewOnly: false, onSelect: jest.fn() }])(
  "keeps role controls out of read-only and assignment lists: %j",
  (mode) => {
    const props = { ...mode, searchTerm: "", handleRoleChange: jest.fn() };
    const html = renderToStaticMarkup(<MemberList {...props} />);
    expect(html).not.toContain('role="combobox"');
    expect(html).toContain("Member");
  }
);
