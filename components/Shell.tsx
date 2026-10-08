"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Aplikasi pengguna tampil dalam bingkai mobile. Dashboard admin memakai layar penuh. */
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return <div className="min-h-dvh bg-bg">{children}</div>;
  return <div className="mx-auto min-h-dvh w-full max-w-md bg-bg shadow-[0_0_40px_-10px_rgba(60,40,20,0.25)]">{children}</div>;
}
