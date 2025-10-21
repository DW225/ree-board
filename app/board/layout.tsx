import NavBar from "@/components/common/NavBar";
import type { ReactNode } from "react";

export default function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
