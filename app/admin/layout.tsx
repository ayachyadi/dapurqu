"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Copy, Check } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Splash } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useAdmin } from "@/lib/admin";

function NoAccess() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl place-items-center px-6">
      <div className="rounded-3xl bg-white p-8 ring-1 ring-line">
        <h1 className="text-xl font-extrabold text-ink">Akun ini belum punya akses admin</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-body">
          Untuk menjadikan akun ini admin, buka Firebase Console, Firestore Database, buat koleksi <b>admins</b>, lalu tambahkan dokumen dengan Document ID berikut (isi field apa saja, misalnya <code>aktif: true</code>):
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-sunken p-3">
          <code className="min-w-0 flex-1 break-all text-[12px] text-ink">{user?.uid}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(user?.uid ?? "").then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-line"
            aria-label="Salin UID"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <p className="mt-4 text-[12px] text-muted">Setelah dokumen dibuat, muat ulang halaman ini.</p>
        <Link href="/" className="mt-5 inline-block text-[14px] font-extrabold text-primary-600">
          Kembali ke aplikasi
        </Link>
      </div>
    </main>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdmin();
  if (loading) return <Splash />;
  if (!isAdmin) return <NoAccess />;
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate mode="app">
      <Guard>{children}</Guard>
    </AuthGate>
  );
}
