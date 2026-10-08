"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Copy, LayoutDashboard, LogOut, Minus, Plus } from "lucide-react";
import { AiKeyForm } from "@/components/AiKeyForm";
import { Button, Chip, Notice, PageHeader, Panel, Spinner, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useAi } from "@/lib/ai-context";
import { useAdmin } from "@/lib/admin";
import { uploadImage } from "@/lib/cloudinary";
import type { Profile } from "@/lib/types";

export default function PengaturanPage() {
  const router = useRouter();
  const { user, profile, saveProfile, logout } = useAuth();
  const { hasKey } = useAi();
  const { isAdmin } = useAdmin();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [servings, setServings] = useState(profile?.defaultServings ?? 4);
  const [pref, setPref] = useState<NonNullable<Profile["cuisinePref"]>>(profile?.cuisinePref ?? "Keduanya");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    try {
      await saveProfile({ displayName: name.trim() || "Chef", defaultServings: servings, cuisinePref: pref });
      setMsg({ tone: "ok", text: "Profil tersimpan." });
    } catch {
      setMsg({ tone: "error", text: "Gagal menyimpan profil. Coba lagi." });
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      await saveProfile({ photoURL: await uploadImage(file) });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <PageHeader title="Pengaturan" onBack={() => router.back()} />
      <div className="space-y-4 px-4">
        <Panel>
          <h2 className="mb-4 text-[15px] font-extrabold">Profil</h2>
          <div className="mb-4 flex items-center gap-4">
            <button onClick={() => fileRef.current?.click()} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary-100 ring-4 ring-white" aria-label="Ganti foto profil">
              {profile?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoURL} alt="Foto profil" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-3xl font-extrabold text-primary-700">{(name || "C").charAt(0).toUpperCase()}</span>
              )}
              <span className="absolute inset-x-0 bottom-0 grid place-items-center bg-black/45 py-1 text-white">{uploading ? <Spinner className="h-3.5 w-3.5" /> : <Camera size={14} />}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold">{profile?.displayName || "Chef"}</p>
              <p className="truncate text-[12px] text-muted">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <TextField label="Nama panggilan" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <span className="mb-1.5 block text-[13px] font-bold">Porsi bawaan</span>
              <div className="inline-flex items-center gap-4 rounded-2xl bg-sunken px-3 py-2">
                <button onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Kurangi" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-primary-600">
                  <Minus size={18} />
                </button>
                <b className="min-w-[4.5rem] text-center">{servings} porsi</b>
                <button onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="Tambah" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-primary-600">
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-bold">Selera masakan</span>
              <div className="flex flex-wrap gap-2">
                {(["Keduanya", "Lokal", "Luar"] as const).map((p) => (
                  <Chip key={p} active={pref === p} onClick={() => setPref(p)}>
                    {p === "Keduanya" ? "Lokal dan luar" : p}
                  </Chip>
                ))}
              </div>
            </div>
            {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
            <Button full onClick={saveAll} loading={saving}>
              Simpan profil
            </Button>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">Asisten AI (Gemini)</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${hasKey ? "bg-secondary-100 text-secondary-700" : "bg-sunken-2 text-body"}`}>{hasKey ? "Aktif" : "Belum diisi"}</span>
          </div>
          <AiKeyForm />
        </Panel>

        <Panel>
          <h2 className="mb-2 text-[15px] font-extrabold">Pengelola resep</h2>
          {isAdmin ? (
            <>
              <p className="mb-3 text-[13px] text-body">Tambah, edit, dan hapus resep katalog dari komputer atau HP tanpa mengubah kode.</p>
              <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[14px] font-bold text-white">
                <LayoutDashboard size={16} /> Buka Dashboard Admin
              </Link>
            </>
          ) : (
            <>
              <p className="mb-2 text-[12px] leading-relaxed text-body">Akun ini bukan admin. ID akun (UID) di bawah dipakai pemilik aplikasi untuk memberi akses admin lewat Firebase Console.</p>
              <div className="flex items-center gap-2 rounded-xl bg-sunken p-2.5">
                <code className="min-w-0 flex-1 break-all text-[11px] text-ink">{user?.uid}</code>
                <button
                  type="button"
                  aria-label="Salin UID"
                  onClick={() => navigator.clipboard.writeText(user?.uid ?? "")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-line"
                >
                  <Copy size={14} />
                </button>
              </div>
            </>
          )}
        </Panel>

        <Button
          variant="outlined"
          full
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut size={17} /> Keluar
        </Button>
        <p className="pb-4 text-center text-[11px] text-muted">DapurQu v0.1 (versi awal)</p>
      </div>
    </>
  );
}
