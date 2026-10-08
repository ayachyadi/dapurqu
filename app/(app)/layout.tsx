"use client";

import type { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate mode="app">
      <div className="pb-24">{children}</div>
      <BottomNav />
    </AuthGate>
  );
}
