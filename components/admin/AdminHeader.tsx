"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";

export function AdminHeader({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <Link href="/admin" className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-[16px] font-extrabold text-ink">
            DapurQu <span className="font-semibold text-muted">Admin</span>
          </span>
        </Link>
        <div className="flex-1">{children}</div>
        <span className="hidden text-[12px] text-muted md:block">{user?.email}</span>
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl bg-sunken px-3 py-2 text-[13px] font-bold text-body hover:bg-sunken-2">
          Lihat aplikasi <ExternalLink size={14} />
        </Link>
      </div>
    </header>
  );
}
