import NavBar from "@/components/common/NavBar";
import ToastSystem from "@/components/common/ToastSystem";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
      <ToastSystem />
    </>
  );
}
