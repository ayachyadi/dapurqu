"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AuthShell, GoogleButton } from "@/components/AuthShell";
import { Button, Notice, TextField } from "@/components/ui";
import { authMessage, useAuth } from "@/lib/auth-context";

export default function DaftarPage() {
  const { signUp, google } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Nama panggilan belum diisi.");
    setBusy(true);
    setErr("");
    try {
      await signUp(email.trim(), password, name.trim());
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
      <AuthShell title="Buat akun DapurQu" subtitle="Simpan resep favorit dan pakai asisten AI di semua perangkatmu.">
        <form onSubmit={submit} className="space-y-4">
          <TextField label="Nama panggilan" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bunda" autoComplete="nickname" required />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" required />
          <TextField
            label="Password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
            minLength={6}
            required
            right={
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Sembunyikan" : "Tampilkan"} className="grid h-9 w-9 place-items-center text-body">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          {err && <Notice tone="error">{err}</Notice>}
          <Button type="submit" full loading={busy}>
            Daftar
          </Button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> atau <span className="h-px flex-1 bg-line" />
        </div>
        <GoogleButton onClick={viaGoogle} />
        <p className="mt-6 text-center text-[14px] text-body">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-extrabold text-primary-600">
            Masuk
          </Link>
        </p>
      </AuthShell>
    </AuthGate>
  );
}
