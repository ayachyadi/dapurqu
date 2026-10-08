"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Splash } from "./ui";

/**
 * mode="app"    : wajib login dan sudah onboarding
 * mode="onboard": wajib login, belum onboarding
 * mode="guest"  : halaman masuk/daftar, pengguna yang sudah login dialihkan
 */
export function AuthGate({ mode, children }: { mode: "app" | "onboard" | "guest"; children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  const target = (() => {
    if (loading) return null;
    if (!user) return mode === "guest" ? null : "/login";
    const done = !!profile?.onboarded;
    if (mode === "guest") return done ? "/" : "/onboarding";
    if (mode === "onboard") return done ? "/" : null;
    return done ? null : "/onboarding";
  })();

  useEffect(() => {
    if (target && target !== path) router.replace(target);
  }, [target, path, router]);

  if (loading || target) return <Splash />;
  return <>{children}</>;
}
