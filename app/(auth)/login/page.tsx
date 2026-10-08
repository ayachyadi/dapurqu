"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AuthShell, GoogleButton } from "@/components/AuthShell";
import { Button, Notice, TextField } from "@/components/ui";
import { authMessage, useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { signIn, google } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await signIn(email.trim(), password);
    } catch (x) {
      setErr(authMessage(x));
      setBusy(false);
    }
  }

  async function viaGoogle() {
    setErr("");
    try {
      await google();
    } catch (x) {
      setErr(authMessage(x));
    }
  }

  return (
    <AuthGate mode="guest">
      <AuthShell title="Selamat datang kembali" subtitle="Masuk untuk lanjut mencari ide masakan hari ini.">
        <form onSubmit={submit} className="space-y-4">
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" required />
          <TextField
            label="Password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password kamu"
            autoComplete="current-password"
            required
            right={
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Sembunyikan" : "Tampilkan"} className="grid h-9 w-9 place-items-center text-body">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          {err && <Notice tone="error">{err}</Notice>}
          <Button type="submit" full loading={busy}>
            Masuk
          </Button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> atau <span className="h-px flex-1 bg-line" />
        </div>
        <GoogleButton onClick={viaGoogle} />
        <p className="mt-6 text-center text-[14px] text-body">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-extrabold text-primary-600">
            Daftar
          </Link>
        </p>
      </AuthShell>
    </AuthGate>
  );
}
